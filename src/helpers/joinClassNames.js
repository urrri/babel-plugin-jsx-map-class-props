export default (...params) =>
  params.filter(param => param && param.toString().trim()).join(' ');

