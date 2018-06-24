export const formatName = function(name, format) {

  if (typeof format === 'string') {
    return format.replace(/\|/g, name);
  }

  return name;
};

export default function(classNames, format) {
  return classNames ? classNames.toString().split(' ') // split to names
  .filter(className => className.trim()) // filter empty
  .map(className => formatName(className, format)) // format
  .filter(className => className) // filter empty after format
  .join(' ') : '';
}
