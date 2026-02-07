const API_KEY = "AIzaSyCjyGQUkRMWSHUJZbEi-kLbsFqei2-o6Aw";

const Core = {
    seq: 3100, activeIdx: 0, pending: null,

    init() {
        Inventory.render();
        this.createNewMemo(); // Generates first memo on load
    },

    createNewMemo() {
        const tpl = document.getElementById('memo-tpl').content.cloneNode(true);
        const card = tpl.querySelector('.memo-card');
        card.querySelector('.m-id').innerText = '#' + this.seq++;
        card.querySelector('.m-date').innerText = new Date().toLocaleDateString();
        
        document.getElementById('pdf-container').prepend(card);
        this.selectMemo(card);
    },

    selectMemo(el) {
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        this.activeIdx = Array.from(document.querySelectorAll('.memo-card')).indexOf(el);
    },

    getActive() { return document.querySelectorAll('.memo-card')[this.activeIdx]; },

    async askGemini() {
        const btn = document.getElementById('ai-btn');
        btn.innerText = "THINKING...";
        const rawText = document.getElementById('magic-box').value;
        const promptText = `Extract from: "${rawText}". Rule: 60 Dhaka, 70 Suburban (Gazipur, Savar), 120 Out. Return JSON only: {"name":"","phone":"","address":"","sku":"","color":"","size":"","qty":1,"ship":60}`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await resp.json();
            const res = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, ""));
            
            const active = this.getActive();
            active.querySelector('.m-name').value = res.name;
            active.querySelector('.m-phone').value = res.phone;
            active.querySelector('.m-addr').value = res.address;
            this.setShipping(res.ship, res.ship == 60 ? "Inside Dhaka" : "Outside");
        } catch (e) { console.error(e); }
        btn.innerText = "PROCESS WITH AI";
    },

    injectRow(col, sz, qty) {
        const active = this.getActive();
        const row = `<tr class="border-b border-gray-100"><td class="py-3 text-gray-400"></td><td>${this.pending.name}</td><td class="text-center text-[10px] uppercase">${col}/${sz}</td><td class="text-center">${qty}</td><td class="text-right font-black"><span class="r-p">${this.pending.price * qty}</span></td></tr>`;
        active.querySelector('.m-body').insertAdjacentHTML('beforeend', row);
        this.recalc();
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

    recalc() {
        const a = this.getActive(); let t = 0; a.querySelectorAll('.r-p').forEach(p => t += parseFloat(p.innerText));
        a.querySelector('.m-t').innerText = t + parseFloat(a.querySelector('.m-s').innerText);
        a.querySelectorAll('.m-body tr').forEach((tr, i) => tr.cells[0].innerText = i+1);
    },

    exportPDF() {
        document.querySelectorAll('.memo-card').forEach(c => c.classList.remove('active'));
        const element = document.getElementById('pdf-container');
        html2pdf().from(element).set({ margin:0, filename:'ONEN-BATCH.pdf', html2canvas:{scale:2}, jsPDF:{unit:'mm', format:'a4', orientation:'portrait'} }).save().then(() => this.getActive().classList.add('active'));
    }
};

const Inventory = {
    data: JSON.parse(localStorage.getItem('ONEN_INV_V71')) || [],
    save() { /* Existing save logic... */ },
    render() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = this.data.map(p => `<div onclick="Core.prepItem('${p.sku}')" class="bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-amber-500"><div class="text-[11px] font-bold text-white">${p.name}</div></div>`).join('');
    }
};

const UI = { toggleModal(s) { document.getElementById('modal-overlay').style.display = s ? 'flex' : 'none'; } };
window.onload = () => Core.init();
