const a = 1, b = 2, c = 3;
const x = <div>

  <div sourceName="a" targetName={c}/>

  <div sourceName={a} targetName="c"/>

  <div sourceName={a} targetName={c}/>

  <div sourceName={a} sourceName1={b} targetName={c}/>

  <div sourceName="a" sourceName1={b} targetName={c}/>

  <div sourceName={a} sourceName1="b" targetName={c}/>

  <div sourceName="a" sourceName1="b" targetName={c}/>

  <div sourceName={"a"} sourceName1={"b"} targetName={"c"}/>

</div>;
