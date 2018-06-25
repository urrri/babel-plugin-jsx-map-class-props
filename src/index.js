// @flow

import babelPluginJsxSyntax from 'babel-plugin-syntax-jsx';
import BabelTypes from 'babel-types';
import ajvKeywords from 'ajv-keywords';
import Ajv from 'ajv';
import genericNames from 'generic-names';
// import optionsSchema from './schemas/optionsSchema.json';
import mergeStringLiteralAttribute from './mergeStringLiteral';
import mergeJsxExpressionAttribute from './mergeJsxExpression';
import { appendOutVars, cleanupInFile, getOutVars, saveOutFiles } from './outFileTools';

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
    ...mapping,
    targetName
  } : undefined;
};

const preformat = (format, fileName, context) => {
  if (!format) {
    return undefined;
  }
  const formatter = (typeof format === 'function') ? format : genericNames(format, {
    context: context || process.cwd()
  });
  const placeholder = 'a__________z';

  const res = formatter(placeholder, fileName);

  return res.replace(new RegExp(placeholder, 'g'), '|');
};

export default ({types: t}: { types: BabelTypes }) => {

  const filenameMap = {};
  const output = {
    count: 0,
    outFiles: {
      // outName: {
      //   inFiles: {
      //     inputName: {
      //       items: [
      //         {
      //           origValue: 'string',
      //           formattedValue: 'string'
      //         }
      //       ]
      //     }
      //   },
      //   dirty: false,
      //   options: {}
      // }
    }
  };

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
    pre(file) {
      const {filename} = file.opts;

      const {outFiles, timer} = output;

      clearTimeout(timer);

      cleanupInFile(outFiles, filename);
    },
    post() {
      // console.log('<<<', Object.keys(filenameMap).length);
      output.count++;
      output.timer = setTimeout(() => {
        // console.log('XXX', Object.keys(filenameMap).length, output.count);
        output.count = 0;
        const {outFiles} = output;

        saveOutFiles(outFiles);
      }, output.count > 10 ? 3000 : 1000);
    },
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
          for (const {attribute, clean, targetName, format: fmt, ...opts} of tasks) {

            if (clean || (options.clean && clean !== false)) {
              attributes.splice(attributes.indexOf(attribute), 1);

            } else {

              const format = preformat(fmt === undefined ? options.format : fmt, filename, options.context);
              const outName = opts.outName || options.outName;
              const contextFileInfo = filenameMap[filename];

              if (t.isJSXExpressionContainer(attribute.value) && t.isStringLiteral(attribute.value.expression)) {
                attribute.value = attribute.value.expression;
              }

              if (t.isStringLiteral(attribute.value)) {
                const sourceValue = attribute.value.value;

                // console.log('>>>', filename, sourceValue, Object.keys(filenameMap).length);

                appendOutVars(output.outFiles, outName, options, filename, getOutVars(sourceValue, format));

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
