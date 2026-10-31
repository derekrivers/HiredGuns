/** Exact comparison for v23's captured ordinary JSON. Capture owns descriptor,
 * prototype and dense-array admission; equality still compares every own key,
 * array length and value. No identity shortcut or source/result memoization. */
export function equalInventorySelectionData(a:unknown,b:unknown):boolean{
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 const array=Array.isArray(a);
 if(array!==Array.isArray(b)||array&&(a as unknown[]).length!==(b as unknown[]).length)return false;
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>,keys=Object.keys(x);
 if(keys.length!==Object.keys(y).length)return false;
 for(let i=0;i<keys.length;i++){
  const k=keys[i]!;if(!Object.hasOwn(y,k))return false;
  const left=x[k],right=y[k];
  // Static geometry is mostly primitive array entries. Compare those directly
  // rather than allocating an every closure and recursively calling per entry.
  if(left===null||right===null||typeof left!=='object'||typeof right!=='object'){
   if(left!==right)return false;
  }else if(!equalInventorySelectionData(left,right))return false;
 }
 return true;
}
