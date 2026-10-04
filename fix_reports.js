const fs = require('fs');
let html = fs.readFileSync('reports.html', 'utf8');

const correctFunc = \unction printBarcodeLabels(){
    const {products}=loadData();
    const selected=[];
    document.querySelectorAll('.bc-check:checked').forEach(chk=>{
      const id=chk.id.replace('bcchk-','');
      const p=Object.values(products).find(x=>x.id===id||String(x.id)===id);
      if(p)selected.push(p);
    });
    if(!selected.length){alert('Please select at least one product.');return;}
    const pa=document.getElementById('print-area');
    pa.className='mode-labels';
    const labelsDiv=document.getElementById('pa-labels');
    
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const codeWord = settings.codeWord || 'ABCDEFGHIJ';

    labelsDiv.innerHTML = \\\<div class="label-grid">\\\ + selected.map(p => {
        const costStr = Math.round(+p.buyPrice || +p.cost || 0).toString();
        let costWord = '';
        for (let i = 0; i < costStr.length; i++) {
            const digit = parseInt(costStr[i]);
            const index = digit === 0 ? 9 : digit - 1;
            costWord += (codeWord[index] || '').toUpperCase();
        }
        return \\\
      <div class="label-item">
        <div class="lname">\\\</div>
        <svg id="pa-bc-\\\" style="height:45px;max-width:100%"></svg>
        <div class="lprice">\\\</div>
        <div style="font-size:10px; color:#64748b; margin-top:2px;">\\\</div>
      </div>\\\;
    }).join('') + \\\</div>\\\;

    selected.forEach(p=>{
      try{
        JsBarcode(\\\#pa-bc-\\\\\\,String(p.barcode||p.id||'0'),{
          format:'CODE128',width:1.2,height:40,displayValue:true,fontSize:9,margin:2,lineColor:'#000',background:'transparent'
        });
      }catch(e){}
    });
    setTimeout(()=>{window.print();},300);
  }\;

const regex = /function printBarcodeLabels\(\)\{.*?setTimeout\(\(\)=>\{window\.print\(\);\},300\);\s*\}/s;
if (regex.test(html)) {
    html = html.replace(regex, correctFunc);
    fs.writeFileSync('reports.html', html);
    console.log('Successfully injected the correct printBarcodeLabels');
} else {
    console.log('Regex did not match.');
}
