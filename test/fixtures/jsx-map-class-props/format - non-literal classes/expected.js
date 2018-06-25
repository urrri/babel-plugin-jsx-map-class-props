import _getClassName from 'babel-plugin-jsx-map-class-props/dist/browser/getClassName';
const b = 'b';
const x = <div>

  <div className={_getClassName('a' + 1, 'e2e-|')} />
  <div className={_getClassName(b, 'format---non-literal-classes_actual_|_a7UkV-M-')} />
  <div className={b} />

</div>;