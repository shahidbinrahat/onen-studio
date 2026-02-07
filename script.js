const API_KEY = "AIzaSyCjyGQUkRMWSHUJZbEi-kLbsFqei2-o6Aw";

const Inventory = {
    data: JSON.parse(localStorage.getItem('ONEN_INV_V73')) || [],
    save() {
        const sku = document.getElementById('in-sku').value.toUpperCase();
        if(!sku) return;
        this.data = this.data.filter(i => i.sku !== sku);
        this.data.push({
            sku, 
            name: document.getElementById('in-name').value,
            price: document.getElementById('in-price').value,
            cols: document.getElementById('in-cols').value.split(','),
            sizes: document.getElementById('in-sizes').value.split(',')
        });
        localStorage.setItem('ONEN_INV_V73', JSON.stringify(this.data));
        this.render();
    },
    exportCSV() {
        let csv = "SKU,Name,Price,Colors,Sizes\n";
        this.data.forEach(p => csv += `${p.sku},${p.name},${p.price},"${p.cols.join('/')}","${p.sizes.join('/')}"\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ONEN_Inventory.csv'; a.click();
    },
    render() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = this.data.map(p => `
            <div onclick="Core.prepItem('${p.sku}')" class="bg-white/5 p-4 rounded-2xl border border-white/5 cursor-pointer hover:border-amber-500 transition-all group">
                <div class="text-[8px] text-amber-500 font-mono font-bold mb-1 opacity-50 group-hover:opacity-100">[${p.sku}]</div>
                <div class="text-xs font-bold uppercase text-white">${p.name}</div>
            </div>
        `).join('');
    }
};

const Core = {
    seq: 3300, activeIdx: 0, pending: null,

    init() { Inventory.render(); this.createNewMemo(); },

    createNewMemo() {
        const tpl = document.getElementById('memo-tpl').content.cloneNode(true);
        const card = tpl.querySelector('.memo-card');
        card.querySelector('.m-id').innerText = '#' + this.seq++;
        card.querySelector('.m-date').innerText = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
        document.getElementById('pdf-container').prepend(card);
        this.selectMemo(card);
    },

    async askGemini() {
        const btn = document.getElementById('ai-btn');
        btn.innerText = "THINKING...";
        const rawText = document.getElementById('magic-box').value;
        
        // Strengthened logic for Bangladeshi cities & areas
        const promptText = `Process order: "${rawText}". 
        Inventory: ${JSON.stringify(Inventory.data)}. 
        Rules: 60 Dhaka, 70 Suburban (Gazipur, Savar, Narayanganj, Keraniganj), 120 Out. 
        Output JSON only: {"name":"","phone":"","address":"","sku":"","color":"","size":"","qty":1,"ship":60}`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await resp.json();
            
            // CLEAN RESPONSE (Removes Markdown if AI accidentally includes it)
            let cleanJson = data.candidates[0].content.parts[0].text;
            cleanJson = cleanJson.replace(/```json|```/g, "").trim();
            const res = JSON.parse(cleanJson);
            
            const active = this.getActive();
            active.querySelector('.m-name').value = res.name;
            active.querySelector('.m-phone').value = res.phone;
            active.querySelector('.m-addr').value = res.address;
            
            const shipLabel = res.ship === 60 ? "Inside Dhaka" : res.ship === 70 ? "Suburban" : "Outside Dhaka";
            this.setShipping(res.ship, shipLabel);

            if(res.sku) {
                this.pending = Inventory.data.find(i => i.sku == res.sku);
                if(this.pending) this.injectRow(res.color || "N/A", res.size || "N/A", res.qty || 1);
            }
        } catch (e) { 
            console.error(e);
            alert("AI Sync Error. Please check your text format.");
        }
        btn.innerText = "PROCESS WITH GEMINI";
    },

    injectRow(col, sz, qty) {
        const active = this.getActive();
        const row = `
            <tr class="border-b border-slate-100">
                <td class="py-4 text-slate-400"></td>
                <td class="py-4">${this.pending.name} <span class="text-[9px] text-slate-300 font-mono">[${this.pending.sku}]</span></td>
                <td class="text-center text-[11px] uppercase">${col}/${sz}</td>
                <td class="text-center">${qty}</td>
                <td class="text-right font-black"><span class="r-p">${this.pending.price * qty}</span></td>
            </tr>`;
        active.querySelector('.m-body').insertAdjacentHTML('beforeend', row);
        this.recalc();
    },

    recalc() {
        const a = this.getActive(); let t = 0;
        a.querySelectorAll('.r-p').forEach(p => t += parseFloat(p.innerText));
        a.querySelector('.m-t').innerText = t + parseFloat(a.querySelector('.m-s').innerText);
        a.querySelectorAll('.m-body tr').forEach((tr, i) => tr.cells[0].innerText = String(i + 1).padStart(2, '0'));
    },

    prepItem(sku) {
        this.pending = Inventory.data.find(i => i.sku === sku);
        document.getElementById('m-title').innerText = this.pending.name;
        document.getElementById('m-sku').innerText = sku;
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
        list.innerHTML = Array.from(document.querySelectorAll('.memo-card')).map((c, i) => `
            <div onclick="Core.selectMemo(document.querySelectorAll('.memo-card')[${i}])" class="p-4 bg-white/5 rounded-2xl text-[10px] cursor-pointer border ${i==this.activeIdx?'border-amber-500 bg-amber-500/10 font-bold':'border-transparent'}">
                ${c.querySelector('.m-id').innerText} — ${c.querySelector('.m-name').value || 'Draft Order'}
            </div>`).join('');
    },
    exportPDF() {
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active'));
        html2pdf().from(document.getElementById('pdf-container')).set({ margin:0, filename:'ONEN_BATCH.pdf', html2canvas:{scale:2}, jsPDF:{unit:'mm', format:'a4', orientation:'portrait'} }).save().then(() => this.getActive().classList.add('active'));
    }
};

const UI = { toggleModal(s) { document.getElementById('modal-overlay').style.display = s ? 'flex' : 'none'; } };
window.onload = () => Core.init();
