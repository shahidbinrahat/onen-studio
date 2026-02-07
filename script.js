const API_KEY = "AIzaSyCjyGQUkRMWSHUJZbEi-kLbsFqei2-o6Aw";

const Inventory = {
    data: JSON.parse(localStorage.getItem('ONEN_INV_V75')) || [],
    
    save() {
        const sku = document.getElementById('in-sku').value.trim().toUpperCase();
        if(!sku) return alert("SKU is required");
        
        // Check for duplicate/Unique SKU
        const existing = this.data.find(i => i.sku === sku);
        if(existing && !confirm("SKU exists. Update product details?")) return;

        this.data = this.data.filter(i => i.sku !== sku);
        this.data.push({
            sku,
            name: document.getElementById('in-name').value,
            price: document.getElementById('in-price').value,
            cols: document.getElementById('in-cols').value.split(','),
            sizes: document.getElementById('in-sizes').value.split(',')
        });

        localStorage.setItem('ONEN_INV_V75', JSON.stringify(this.data));
        this.render();
        this.clearForm();
    },

    deleteProduct(sku) {
        if(confirm(`Delete SKU: ${sku}?`)) {
            this.data = this.data.filter(i => i.sku !== sku);
            localStorage.setItem('ONEN_INV_V75', JSON.stringify(this.data));
            this.render();
        }
    },

    editProduct(sku) {
        const p = this.data.find(i => i.sku === sku);
        document.getElementById('in-sku').value = p.sku;
        document.getElementById('in-name').value = p.name;
        document.getElementById('in-price').value = p.price;
        document.getElementById('in-cols').value = p.cols.join(',');
        document.getElementById('in-sizes').value = p.sizes.join(',');
    },

    clearForm() {
        ['in-sku','in-name','in-price','in-cols','in-sizes'].forEach(id => document.getElementById(id).value = "");
    },

    render() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = this.data.map(p => `
            <div class="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center group">
                <div onclick="Core.prepItem('${p.sku}')" class="cursor-pointer flex-grow">
                    <div class="text-[8px] text-amber-500 font-mono">[${p.sku}]</div>
                    <div class="text-xs font-bold uppercase">${p.name}</div>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="Inventory.editProduct('${p.sku}')" class="text-blue-400 text-[10px]">Edit</button>
                    <button onclick="Inventory.deleteProduct('${p.sku}')" class="text-red-400 text-[10px]">Del</button>
                </div>
            </div>`).join('');
    },

    exportCSV() {
        let csv = "SKU,Name,Price,Colors,Sizes\n";
        this.data.forEach(p => csv += `${p.sku},${p.name},${p.price},"${p.cols.join('/')}","${p.sizes.join('/')}"\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'ONEN_Inventory.csv'; a.click();
    }
};

const Core = {
    seq: 3500, activeIdx: 0, pending: null,
    init() { Inventory.render(); this.createNewMemo(); },
    
    createNewMemo() {
        const tpl = document.getElementById('memo-tpl').content.cloneNode(true);
        const card = tpl.querySelector('.memo-card');
        card.querySelector('.m-id').innerText = '#' + this.seq++;
        card.querySelector('.m-date').innerText = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
        document.getElementById('pdf-container').prepend(card);
        this.selectMemo(card);
    },

    deleteMemo(e, btn) {
        e.stopPropagation();
        if(confirm("Delete this memo from batch?")) {
            btn.closest('.memo-card').remove();
            this.updateBatchList();
        }
    },

    async askGemini() {
        const btn = document.getElementById('ai-btn');
        btn.innerText = "WAIT...";
        const rawText = document.getElementById('magic-box').value;
        const promptText = `Process: "${rawText}". Inv: ${JSON.stringify(Inventory.data)}. Rules: 60 Dhaka, 70 Suburban, 120 Out. JSON ONLY: {"name":"","phone":"","address":"","sku":"","color":"","size":"","qty":1,"ship":60}`;
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await resp.json();
            const res = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
            const active = this.getActive();
            active.querySelector('.m-name').value = res.name;
            active.querySelector('.m-phone').value = res.phone;
            active.querySelector('.m-addr').value = res.address;
            this.setShipping(res.ship, res.ship == 60 ? "Inside Dhaka" : "Outside");
            if(res.sku) { this.pending = Inventory.data.find(i => i.sku == res.sku); if(this.pending) this.injectRow(res.color||"N/A", res.size||"N/A", res.qty||1); }
        } catch (e) { alert("AI Error"); }
        btn.innerText = "PROCESS AI";
    },

    injectRow(col, sz, qty) {
        const active = this.getActive();
        const row = `<tr class="border-b border-gray-100"><td class="py-3 text-slate-400"></td><td>${this.pending.name}</td><td class="text-center">${col}/${sz}</td><td class="text-center">${qty}</td><td class="text-right font-black"><span class="r-p">${this.pending.price * qty}</span></td></tr>`;
        active.querySelector('.m-body').insertAdjacentHTML('beforeend', row);
        this.recalc();
    },

    recalc() {
        const a = this.getActive(); let t = 0;
        a.querySelectorAll('.r-p').forEach(p => t += parseFloat(p.innerText));
        a.querySelector('.m-t').innerText = t + parseFloat(a.querySelector('.m-s').innerText);
        a.querySelectorAll('.m-body tr').forEach((tr, i) => tr.cells[0].innerText = i + 1);
    },

    prepItem(sku) {
        this.pending = Inventory.data.find(i => i.sku === sku);
        document.getElementById('m-title').innerText = this.pending.name;
        document.getElementById('m-col').innerHTML = this.pending.cols.map(c => `<option>${c.trim()}</option>`).join('');
        document.getElementById('m-sz').innerHTML = this.pending.sizes.map(s => `<option>${s.trim()}</option>`).join('');
        UI.toggleModal(true);
    },

    confirmInject() { this.injectRow(document.getElementById('m-col').value, document.getElementById('m-sz').value, document.getElementById('m-qty').value); UI.toggleModal(false); },
    setShipping(v, l) { const a = this.getActive(); a.querySelector('.m-s').innerText = v; a.querySelector('.m-tag').innerText = l; this.recalc(); },
    selectMemo(el) { document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active')); el.classList.add('active'); this.activeIdx = Array.from(document.querySelectorAll('.memo-card')).indexOf(el); this.updateBatchList(); },
    getActive() { return document.querySelectorAll('.memo-card')[this.activeIdx]; },
    updateBatchList() {
        const list = document.getElementById('batch-list');
        list.innerHTML = Array.from(document.querySelectorAll('.memo-card')).map((c, i) => `<div onclick="Core.selectMemo(document.querySelectorAll('.memo-card')[${i}])" class="p-3 bg-white/5 rounded-xl text-[9px] cursor-pointer border ${i==this.activeIdx?'border-amber-500 bg-amber-500/10 font-bold':'border-transparent'}">${c.querySelector('.m-id').innerText} — ${c.querySelector('.m-name').value || 'New Entry'}</div>`).join('');
    },
    exportPDF() {
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active'));
        html2pdf().from(document.getElementById('pdf-container')).set({ margin:0, filename:'ONEN-BATCH.pdf', html2canvas:{scale:2}, jsPDF:{unit:'mm', format:'a4', orientation:'portrait'} }).save().then(() => this.getActive().classList.add('active'));
    }
};

const UI = { toggleModal(s) { document.getElementById('modal-overlay').style.display = s ? 'flex' : 'none'; } };
window.onload = () => Core.init();
