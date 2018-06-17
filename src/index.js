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

export default ({types: t}: { types: BabelTypes }) => {

  const filenameMap = {};

  const setupFileForImport = (path, filename) => {
    const programPath = path.isProgram() ? path : path.findParent(parentPath => parentPath.isProgram());

    const identifier = programPath.scope.generateUidIdentifier(filename);
    const filePath = 'babel-plugin-jsx-map-class-props/dist/browser/' + filename;

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

  const setupFileForRuntimeFormat = (path, filename) => {
    if (!filenameMap[filename].importedFormatterIndentifier) {
      filenameMap[filename].importedFormatterIndentifier = setupFileForImport(path, 'getClassName');
    }

    return filenameMap[filename].importedFormatterIndentifier;
  };

  const setupFileForRuntimeJoin = (path, filename) => {
    if (!filenameMap[filename].importedJoinerIndentifier) {
      filenameMap[filename].importedJoinerIndentifier = setupFileForImport(path, 'joinClassNames');
    }

    return filenameMap[filename].importedJoinerIndentifier;
  };

  return {
    inherits: babelPluginJsxSyntax,
    visitor: {
      JSXElement(path: *, stats: *): void {

        if (!stats.opts || !stats.opts.mappings) {
          return;
        }

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

        const collectTaskParams = (mapping, sourceName) => {
          if (!mapping) {
            return undefined;
          }
          if (mapping.clean) {
            return {clean: true};
          }
          const targetName = matchTargetName(mapping, sourceName);

          return targetName ? {
            format: mapping.format === undefined ? stats.opts.format : mapping.format,
            targetName,
            clean: mapping.clean
          } : undefined;
        };

        const isMatch = (mapping, name) =>
            (mapping.sourceName && mapping.sourceName === name) ||
            (mapping.sourceMask && name.match(mapping.sourceMask)) ||
            (mapping.prefix && name.startsWith(mapping.prefix));

        const filename = stats.file.opts.filename;

        const mappings = stats.opts.mappings;

        const attributes = path.node.openingElement.attributes;

        const tasks = attributes.reduce((acc, attr) => {

          if (attr.name) {
            const name = attr.name.name;

            const mapping = mappings.find(mapping_ => isMatch(mapping_, name));

            const task = collectTaskParams(mapping, name);

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

        // perform tasks
        for (const {attribute, clean, targetName, format: fmt} of tasks) {

          if (clean || (stats.opts.clean && clean !== false)) {
            attributes.splice(attributes.indexOf(attribute), 1);

          } else {

            const format = preformat(fmt === undefined ? stats.opts.format : fmt, filename);

            if (t.isStringLiteral(attribute.value)) {

              mergeStringLiteralAttribute(
                  t,
                  path,
                  attribute,
                  targetName,
                  filenameMap[filename].getJoinerIdentifier,
                  format
              );

            } else if (t.isJSXExpressionContainer(attribute.value)) {

              mergeJsxExpressionAttribute(
                  t,
                  path,
                  attribute,
                  targetName,
                  filenameMap[filename].getFormatterIdentifier,
                  filenameMap[filename].getJoinerIdentifier,
                  format
              );

            }
          }
        }
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
          getFormatterIdentifier: () => setupFileForRuntimeFormat(path, filename),
          getJoinerIdentifier: () => setupFileForRuntimeJoin(path, filename)
        };
      }
    }
  };
};
