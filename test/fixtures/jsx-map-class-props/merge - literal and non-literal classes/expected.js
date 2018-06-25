import _joinClassNames from "babel-plugin-jsx-map-class-props/dist/browser/joinClassNames";
const a = 1,
      b = 2,
      c = 3;
const x = <div>

  <div targetName={_joinClassNames(c, "a")} />

  <div targetName={_joinClassNames("c", a)} />

  <div targetName={_joinClassNames(c, a)} />

  <div targetName={_joinClassNames(_joinClassNames(c, a), b)} />

  <div targetName={_joinClassNames(_joinClassNames(c, "a"), b)} />

  <div targetName={_joinClassNames(_joinClassNames(c, a), "b")} />

  <div targetName={_joinClassNames(_joinClassNames(c, "a"), "b")} />

  <div targetName="c a b" />

</div>;