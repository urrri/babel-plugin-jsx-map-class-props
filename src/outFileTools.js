import fs from 'fs';
import genericNames from 'generic-names/index';
import camelCase from 'lodash/camelCase';
import snakeCase from 'lodash/snakeCase';
import { formatName } from './helpers/getClassName';

/*
options:{
  outFiles:{
    name: 'path',
    format: 'json'|'js'|function(groups, options){}
    flat: false,
    case: 'camel'|'upper',
    varFormat: 'string',
    groupFormat: 'string'
  }
}
 */

const iterateOutFiles = (outFiles, iterator) => {
  for (const o in (outFiles || {})) {
    if (outFiles.hasOwnProperty(o) && outFiles[o]) {
      iterator(outFiles[o]);
    }
  }
};

export const cleanupInFile = (outFiles, inName) => {
  iterateOutFiles(outFiles, outFile => {
    const inFiles = outFile.inFiles;

    if (inFiles && inFiles[inName]) {
      delete inFiles[inName];
      outFile.dirty = true;
    }

  });
};

export const getOutVars = (values, format) => {
  const origValues = values ? values.split(' ').filter(_ => _.trim()) : [];

  if (!values.length) {
    return [];
  }

  return origValues.map(origValue => ({
    origValue,
    formattedValue: format ? formatName(origValue, format) : origValue
  }));
};

const prepareOutFile = (outFiles, outName, options) => {
  if (!outName) {
    return undefined;
  }
  const outFile = outFiles[outName] = outFiles[outName] || {name: outName};

  if (!outFile.options && options && options.outFiles) {
    const outFileOptions = options.outFiles.find(opt => opt.name === outName);

    if (outFileOptions) {
      outFile.options = outFileOptions;
    }
  }

  return outFile;
};

export const appendOutVars = (outFiles, outName, options, inName, valuePairs) => {
  if (!valuePairs || !valuePairs.length) {
    return;
  }

  const outFile = prepareOutFile(outFiles, outName, options);

  if (outFile) {

    const inFiles = outFile.inFiles = outFile.inFiles || {};
    const inFile = inFiles[inName] = inFiles[inName] || {};

    inFile.context = inFile.context || options.context || process.cwd();
    inFile.items = inFile.items || [];
    inFile.items.push(...valuePairs);
    outFile.dirty = true;
  }

};

const saveFile = (fileName, content) => {
  content += '\n';
//  console.log(fileName, '\n', content);
  fs.writeFileSync(fileName, content, 'utf8');
};

const formatJsonGroups = (groups, options) => {
  const json = {};

  groups.forEach(group => {
    const groupItems = options.flat ? json : json[group.name] = {};

    group.items.forEach(item => {
      groupItems[item.origValue] = item.formattedValue;
    });

  });

  return JSON.stringify(json, null, 2);
};

const formatVar = ({origValue, formattedValue}, options) => {
  return (options.flat ?
          `export const ${origValue} = '${formattedValue}';` :
          `  ${origValue}: '${formattedValue}'`);
};

const formatVarGroup = ({name, items}, options) => {
  const res = items.map(item => formatVar(item, options));

  return options.flat ?
         res.join('\n') :
         'export const ' + name + ' = {\n' + res.join(',\n') + '\n};';
};

const formatVarGroups = (groups, options) => {
  if (typeof options.format === 'function') {
    return options.format(groups, options);
  }
  const res = groups.map(group => formatVarGroup(group, options));

  if (options.format === 'json') {
    return formatJsonGroups(groups, options);
  }

  return res.join('\n\n');
};

const formatByCase = varCase => {
  if (varCase === 'upper') {
    return name => snakeCase(name).toUpperCase();
  } else {
    // came is default, also if error type entered
    return name => camelCase(name);
  }
};

const getGroupName = (inName, {case: varCase, flat, groupFormat = '[path]-[name]'} = {}, context) => {
  if (flat) {
    return '';
  }
  const formatter = genericNames(groupFormat, {
    context: context || process.cwd()
  });
  const res = formatter('', inName);

  return formatByCase(varCase)(res);
};

const filterUniqueItems = (items, inName) => {
  const map = {};

  return items.filter(item => {
    if (map[item.origValue]) {
      if (map[item.origValue] !== item.formattedValue) {
        // eslint-disable-next-line no-console
        console.warn(`Found duplicated variable "${item.origValue}" with different value: "${item.formattedValue}"
        in file: ${inName}
        value skipped.`);
      }

      return false;
    }
    map[item.origValue] = item.formattedValue;

    return true;
  });
};

const formatVarNames = (items, inName, {case: varCase = 'camel', varFormat} = {}, context) => {

  const formatter = varFormat ? genericNames(varFormat, {
    context: context || process.cwd()
  }) : _ => _;

  const caseFormatter = formatByCase(varCase);

  items = items.map(item => ({...item, origValue: caseFormatter(formatter(item.origValue, inName))}));

  return items;
};

const flatVarGroups = varGroups => {
  const items = filterUniqueItems(varGroups.reduce((acc, group) => {
    acc.push(...group.items);

    return acc;
  }, []), 'cross files');

  if (!items) {
    return [];
  }

  return [{items}];
};

export const saveOutFile = outFile => {
  const inFiles = outFile.inFiles;
  const options = outFile.options || {};

  let varGroups = [];

  for (const inName in inFiles) {
    if (inFiles.hasOwnProperty(inName)) {
      const inFile = inFiles[inName];

      if (inFile && inFile.items) {
        const items = formatVarNames(inFile.items, inName, options, inFile.context);

        varGroups.push(
            {items: filterUniqueItems(items, inName), name: getGroupName(inName, options, inFile.context)});
      }
    }
  }

  if (options.flat) {
    varGroups = flatVarGroups(varGroups);
  }

  if (!varGroups.length) {
    return;
  }

  const formatted = formatVarGroups(varGroups, options);

  saveFile(outFile.name, formatted);
};

export const saveOutFiles = outFiles => {
  iterateOutFiles(outFiles, outFile => {

    if (outFile.dirty && outFile.inFiles) {
      outFile.dirty = false;
      saveOutFile(outFile);
    }
  });

};
