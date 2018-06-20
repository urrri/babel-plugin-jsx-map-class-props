// @flow

import babelPluginJsxSyntax from 'babel-plugin-syntax-jsx';
import BabelTypes from 'babel-types';
import ajvKeywords from 'ajv-keywords';
import Ajv from 'ajv';
import genericNames from 'generic-names';
// import optionsSchema from './schemas/optionsSchema.json';
import mergeStringLiteralAttribute from './mergeStringLiteral';
import mergeJsxExpressionAttribute from './mergeJsxExpression';

const ajv = new Ajv({
  // eslint-disable-next-line id-match
  $data: true
});

ajvKeywords(ajv);

// const validate = ajv.compile(optionsSchema);

const matchTargetName = (mapping, sourceName) => {
  if (mapping.targetName) {
    return mapping.targetName;
  } else if (mapping.sourceMask && sourceName.match(mapping.sourceMask) && mapping.targetMask) {
    return sourceName.replace(mapping.sourceMask, mapping.targetMask);
  } else if (mapping.prefix && sourceName.startsWith(mapping.prefix)) {
    return sourceName.substr(mapping.prefix.length);
  }

  return undefined;
};

const isMappingMatchAttr = (mapping, attrName) =>
    (mapping.sourceName && mapping.sourceName === attrName) ||
    (mapping.sourceMask && attrName.match(mapping.sourceMask)) ||
    (mapping.prefix && attrName.startsWith(mapping.prefix));

const collectTaskParams = (mapping, sourceName) => {
  if (!mapping) {
    return undefined;
  }
  if (mapping.clean) {
    return {clean: true};
  }
  const targetName = matchTargetName(mapping, sourceName);

  return targetName ? {
    format: mapping.format,
    targetName,
    clean: mapping.clean
  } : undefined;
};

const preformat = (format, fileName) => {
  if (!format) {
    return undefined;
  }
  const formatter = (typeof format === 'function') ? format : genericNames(format, {
    context: process.cwd()
  });
  const placeholder = 'a__________z';

  const res = formatter(placeholder, fileName);

  return res.replace(new RegExp(placeholder, 'g'), '|');
};

export default ({types: t}: { types: BabelTypes }) => {

  const filenameMap = {};

  const setupFileForImport = (path, importFileName) => {
    const programPath = path.isProgram() ? path : path.findParent(parentPath => parentPath.isProgram());

    const identifier = programPath.scope.generateUidIdentifier(importFileName);
    const filePath = 'babel-plugin-jsx-map-class-props/dist/browser/' + importFileName;

    programPath.unshiftContainer(
        'body',
        t.importDeclaration(
            [
              t.importDefaultSpecifier(
                  identifier
              )
            ],
            t.stringLiteral(filePath)
        )
    );

    return identifier;
  };

  const setupImportFor = (path, importFileName, contextFileInfo) => {
    if (!contextFileInfo[importFileName]) {
      contextFileInfo[importFileName] = setupFileForImport(path, importFileName);
    }

    return contextFileInfo[importFileName];
  };

  return {
    inherits: babelPluginJsxSyntax,
    visitor: {
      JSXElement(path: *, stats: *): void {

        if (!stats.opts || !stats.opts.mappings) {
          return;
        }

        const {filename} = stats.file.opts;

        const options = stats.opts;

        const {attributes} = path.node.openingElement;

        const tasks = attributes.reduce((acc, attr) => {

          if (attr.name) {
            const attrName = attr.name.name;

            const mapping = options.mappings.find(mapping_ => isMappingMatchAttr(mapping_, attrName));

            const task = collectTaskParams(mapping, attrName);

            if (task) {
              task.attribute = attr;
              acc.push(task);
            }
          }

          return acc;

        }, []);

        if (tasks.length === 0) {
          return;
        }

        // perform tasks
        const performTasks = () => {
          for (const {attribute, clean, targetName, format: fmt} of tasks) {

            if (clean || (options.clean && clean !== false)) {
              attributes.splice(attributes.indexOf(attribute), 1);

            } else {

              const format = preformat(fmt === undefined ? options.format : fmt, filename);
              const contextFileInfo = filenameMap[filename];

              if (t.isStringLiteral(attribute.value)) {

                mergeStringLiteralAttribute(
                    t,
                    path,
                    attribute,
                    targetName,
                    contextFileInfo.getJoinerIdentifier,
                    format
                );

              } else if (t.isJSXExpressionContainer(attribute.value)) {

                mergeJsxExpressionAttribute(
                    t,
                    path,
                    attribute,
                    targetName,
                    contextFileInfo.getFormatterIdentifier,
                    contextFileInfo.getJoinerIdentifier,
                    format
                );

              }
            }
          }
        };

        performTasks();
      },
      Program(path: *, stats: *): void {

        // if (!validate(stats.opts)) {
        //   // eslint-disable-next-line no-console
        //   console.error(validate.errors);
        //
        //   throw new Error('Invalid configuration');
        // }

        stats.opts.mappings.forEach(mapping => {
          if (mapping.sourceMask && typeof mapping.sourceMask === 'string') {
            mapping.sourceMask = new RegExp(mapping.sourceMask, 'g');
          }
        });

        const filename = stats.file.opts.filename;

        filenameMap[filename] = {
          getFormatterIdentifier:
              () => setupImportFor(path, 'getClassName', filenameMap[filename]),
          getJoinerIdentifier:
              () => setupImportFor(path, 'joinClassNames', filenameMap[filename])
        };
      }
    }
  };
};