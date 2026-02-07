const API_KEY = "AIzaSyCjyGQUkRMWSHUJZbEi-kLbsFqei2-o6Aw";

const Inventory = {
    // Uses a versioned key to prevent data corruption from older versions
    data: JSON.parse(localStorage.getItem('ONEN_INV_V77')) || [],
    
    save() {
        const skuInput = document.getElementById('in-sku');
        const sku = skuInput.value.trim().toUpperCase();
        if(!sku) return alert("Please enter a Unique SKU");
        
        const existing = this.data.find(i => i.sku === sku);
        if(existing && !confirm(`SKU ${sku} already exists. Update it?`)) return;

        // Functional update: filters old, adds new
        this.data = this.data.filter(i => i.sku !== sku);
        this.data.push({
            sku,
            name: document.getElementById('in-name').value.trim(),
            price: parseFloat(document.getElementById('in-price').value) || 0,
            cols: document.getElementById('in-cols').value.split(',').map(s => s.trim()),
            sizes: document.getElementById('in-sizes').value.split(',').map(s => s.trim())
        });

        localStorage.setItem('ONEN_INV_V77', JSON.stringify(this.data));
        this.render();
        this.clearForm();
    },

    deleteProduct(sku) {
        if(confirm(`Remove SKU: ${sku} from database?`)) {
            this.data = this.data.filter(i => i.sku !== sku);
            localStorage.setItem('ONEN_INV_V77', JSON.stringify(this.data));
            this.render();
        }
    },

    editProduct(sku) {
        const p = this.data.find(i => i.sku === sku);
        if(!p) return;
        document.getElementById('in-sku').value = p.sku;
        document.getElementById('in-name').value = p.name;
        document.getElementById('in-price').value = p.price;
        document.getElementById('in-cols').value = p.cols.join(', ');
        document.getElementById('in-sizes').value = p.sizes.join(', ');
        document.getElementById('in-sku').focus();
    },

    clearForm() {
        ['in-sku','in-name','in-price','in-cols','in-sizes'].forEach(id => document.getElementById(id).value = "");
    },

    render() {
        const list = document.getElementById('inventory-list');
        if(!list) return;
        list.innerHTML = this.data.length ? this.data.map(p => `
            <div class="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center group hover:border-amber-500/50 transition-all">
                <div onclick="Core.prepItem('${p.sku}')" class="cursor-pointer flex-grow">
                    <div class="text-[8px] text-amber-500 font-mono font-bold">[${p.sku}]</div>
                    <div class="text-xs font-bold uppercase tracking-tight text-white/90">${p.name}</div>
                </div>
                <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="Inventory.editProduct('${p.sku}')" class="text-blue-400 text-[10px] font-bold uppercase">Edit</button>
                    <button onclick="Inventory.deleteProduct('${p.sku}')" class="text-red-500 text-[10px] font-bold uppercase">Del</button>
                </div>
            </div>`).join('') : `<div class="text-[10px] text-white/10 text-center py-4">Inventory Empty</div>`;
    },

    exportCSV() {
        if(!this.data.length) return alert("No data to export");
        let csv = "SKU,Name,Price,Colors,Sizes\n";
        this.data.forEach(p => csv += `${p.sku},${p.name},${p.price},"${p.cols.join('/')}","${p.sizes.join('/')}"\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ONEN_Inventory_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    }
};

const Core = {
    seq: 3600, activeIdx: 0, pending: null,
    
    init() { 
        Inventory.render(); 
        this.createNewMemo(); 
    },
    
    createNewMemo() {
        const tpl = document.getElementById('memo-tpl');
        if(!tpl) return;
        const clone = tpl.content.cloneNode(true);
        const card = clone.querySelector('.memo-card');
        card.querySelector('.m-id').innerText = '#' + this.seq++;
        card.querySelector('.m-date').innerText = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
        document.getElementById('pdf-container').prepend(card);
        this.selectMemo(card);
    },

    deleteMemo(e, btn) {
        e.stopPropagation();
        if(confirm("Permanently delete this memo?")) {
            btn.closest('.memo-card').remove();
            const remaining = document.querySelectorAll('.memo-card');
            if(remaining.length === 0) {
                this.createNewMemo();
            } else {
                this.selectMemo(remaining[0]);
            }
        }
    },

    async askGemini() {
        const btn = document.getElementById('ai-btn');
        const box = document.getElementById('magic-box');
        if(!box.value.trim()) return;
        
        btn.innerText = "TRANSLATING...";
        btn.disabled = true;

        const promptText = `Extract from: "${box.value}". 
        Translate Bangla to English. 
        Inventory: ${JSON.stringify(Inventory.data)}. 
        Rules: 60 Dhaka, 70 Suburban (Gazipur, Savar, Narayanganj), 120 Out. 
        JSON ONLY: {"name":"","phone":"","address":"","sku":"","color":"","size":"","qty":1,"ship":60}`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await resp.json();
            let text = data.candidates[0].content.parts[0].text;
            // Bug Fix: Remove all non-JSON characters (markdown triple backticks)
            let cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const res = JSON.parse(cleanJson);
            
            const active = this.getActive();
            active.querySelector('.m-name').value = (res.name || "").toUpperCase();
            active.querySelector('.m-phone').value = res.phone || "";
            active.querySelector('.m-addr').value = res.address || "";
            
            const label = res.ship === 60 ? "Inside Dhaka" : res.ship === 70 ? "Suburban" : "Outside Dhaka";
            this.setShipping(res.ship || 60, label);

            if(res.sku) {
                this.pending = Inventory.data.find(i => i.sku == res.sku);
                if(this.pending) this.injectRow(res.color || "N/A", res.size || "N/A", res.qty || 1);
            }
        } catch (e) { 
            console.error(e);
            alert("AI Sync Error. Please check manually."); 
        } finally {
            btn.innerText = "PROCESS AI";
            btn.disabled = false;
        }
    },

    injectRow(col, sz, qty) {
        const active = this.getActive();
        if(!active) return;
        const row = `
            <tr class="border-b border-gray-100">
                <td class="py-3 text-slate-400 text-[10px]"></td>
                <td class="py-3">${this.pending.name} <span class="text-[9px] text-slate-300 uppercase">[${this.pending.sku}]</span></td>
                <td class="text-center text-[11px] uppercase">${col}/${sz}</td>
                <td class="text-center">${qty}</td>
                <td class="text-right font-black"><span class="r-p">${this.pending.price * qty}</span></td>
            </tr>`;
        active.querySelector('.m-body').insertAdjacentHTML('beforeend', row);
        this.recalc();
    },

    recalc() {
        const a = this.getActive();
        if(!a) return;
        let t = 0;
        a.querySelectorAll('.r-p').forEach(p => t += parseFloat(p.innerText) || 0);
        const shipping = parseFloat(a.querySelector('.m-s').innerText) || 0;
        a.querySelector('.m-t').innerText = t + shipping;
        a.querySelectorAll('.m-body tr').forEach((tr, i) => tr.cells[0].innerText = String(i + 1).padStart(2, '0'));
    },

    prepItem(sku) {
        this.pending = Inventory.data.find(i => i.sku === sku);
        if(!this.pending) return;
        document.getElementById('m-title').innerText = this.pending.name;
        document.getElementById('m-col').innerHTML = this.pending.cols.map(c => `<option>${c}</option>`).join('');
        document.getElementById('m-sz').innerHTML = this.pending.sizes.map(s => `<option>${s}</option>`).join('');
        UI.toggleModal(true);
    },

    confirmInject() { 
        this.injectRow(document.getElementById('m-col').value, document.getElementById('m-sz').value, document.getElementById('m-qty').value); 
        UI.toggleModal(false); 
    },

    setShipping(v, l) { 
        const a = this.getActive(); 
        if(!a) return;
        a.querySelector('.m-s').innerText = v; 
        a.querySelector('.m-tag').innerText = l; 
        this.recalc(); 
    },

    selectMemo(el) { 
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active')); 
        el.classList.add('active'); 
        const cards = Array.from(document.querySelectorAll('.memo-card'));
        this.activeIdx = cards.indexOf(el); 
        this.updateBatchList(); 
    },

    getActive() { 
        return document.querySelectorAll('.memo-card')[this.activeIdx]; 
    },

    updateBatchList() {
        const list = document.getElementById('batch-list');
        if(!list) return;
        list.innerHTML = Array.from(document.querySelectorAll('.memo-card')).map((c, i) => `
            <div onclick="Core.selectMemo(document.querySelectorAll('.memo-card')[${i}])" 
                 class="p-3 bg-white/5 rounded-xl text-[10px] cursor-pointer border transition-all ${i==this.activeIdx?'border-amber-500 bg-amber-500/10 font-bold':'border-transparent'}">
                ${c.querySelector('.m-id').innerText} — ${c.querySelector('.m-name').value || 'New Order'}
            </div>`).join('');
    },

    exportPDF() {
        const container = document.getElementById('pdf-container');
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active'));
        const opt = {
            margin: 0,
            filename: `ONEN_Batch_${new Date().getTime()}.pdf`,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(container).set(opt).save().then(() => {
            this.getActive().classList.add('active');
        });
    }
};

const UI = { toggleModal(s) { document.getElementById('modal-overlay').style.display = s ? 'flex' : 'none'; } };

window.onload = () => Core.init();
