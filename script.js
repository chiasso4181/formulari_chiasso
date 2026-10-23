const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw4oSO5i5uyFDa5AXz-ji81TpBHWNnFNbaDpJM466QgZDeZ8SUppGqiEiaEFiLeYi2VsQ/exec";
    const PASSWORD_ADMIN = "Chiasso4181";
    const LS_CONTI_PARTNER = "contiPartnerCustom";
    const LS_STATUS_117 = "statusExtra117";
    const LS_STATUS_118 = "statusExtra118";
    const SS_PASSWORD_OK = "passwordSessioneOk";

    let foglioCorrente = '11.73import'; 

    // LISTA PARTNER PULITA E SENZA DUPLICATI (default codice)
    const contiPartnerDefault = {
        "Ansali SA - Chiasso Strada": "4011-3",
        "Astra Trasporti Int. SA": "4001-4",
        "B&A Customs SA": "15694-3",
        "B&G International Sagl": "15858-9",
        "Carugati SA": "4073-3",
        "Cippà Trasporti SA": "4084-0",
        "Extrasped SA": "2909-2",
        "Focus 93 GmBh": "1359-9",
        "Four Transport": "18616-2",
        "Franzosini SA": "18926-2",
        "Gasped Trasporti Int. SA": "16551-8",
        "Gerlach AG": "7827-4",
        "Globus Trasporti Int. SA": "4127-7",
        "Gondrand SA - Import e Export": "4124-4",
        "Intervia Transport SA": "4146-7",
        "Intex SA": "4144-2",
        "Jacam Import Export SA": "9615-4",
        "Lems Le Prese": "5701-0",
        "Licaf Spedizioni Sagl": "4311-4",
        "MB Express": "2141-8",
        "MC Trans SA": "3516-7",
        "Newtrans SA": "5635-6",
        "OLG international Chiasso": "14886-3",
        "PESA SA - Chiasso": "5175-5",
        "Piffaretti & Olivieri SA": "4239-0",
        "PostLogistic AG": "9405-4",
        "Progress Transport SA": "4247-2",
        "Rolo SA": "4357-0",
        "Sieber Transport SA": "1720-2",
        "Spedimar Sagl - Chiasso": "4123-6",
        "Sprinter SA": "9262-9",
        "Trans Service SA - Chiasso": "4238-2",
        "WeDeclare": "20537-5",
        "Zürcher Trasporti SA": "7491-7",
        "Altro": "3224-9"
    };

    let contiPartner = Object.assign({}, contiPartnerDefault);
    let statusExtra117 = [];
    let statusExtra118 = [];

    // --- Vista tabella ---
    let vistaRisultati = 'scheda';
    let tabellaModificabile = false;
    let sortColonna = null;
    let sortAsc = true;
    let filtriTabella = {};
    let indiciTabellaOrdinati = [];
    let righeModificate = new Set();
    let esitiRiga = {};

    function passwordSessioneOk() {
        return sessionStorage.getItem(SS_PASSWORD_OK) === "1";
    }

    function richiediPasswordSessione(messaggio) {
        if (passwordSessioneOk()) return true;
        let pwd = prompt(messaggio || "Inserisci la password:");
        if (pwd === PASSWORD_ADMIN) {
            sessionStorage.setItem(SS_PASSWORD_OK, "1");
            return true;
        }
        if (pwd !== null) alert("Password non corretta.");
        return false;
    }

    function caricaConfigLocale() {
        try {
            let custom = localStorage.getItem(LS_CONTI_PARTNER);
            if (custom) {
                let parsed = JSON.parse(custom);
                if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                    // Lista completa da Admin (override); altrimenti default codice
                    contiPartner = parsed;
                } else {
                    contiPartner = Object.assign({}, contiPartnerDefault);
                }
            } else {
                contiPartner = Object.assign({}, contiPartnerDefault);
            }
        } catch (e) {
            contiPartner = Object.assign({}, contiPartnerDefault);
        }
        try {
            statusExtra117 = JSON.parse(localStorage.getItem(LS_STATUS_117) || "[]") || [];
        } catch (e) { statusExtra117 = []; }
        try {
            statusExtra118 = JSON.parse(localStorage.getItem(LS_STATUS_118) || "[]") || [];
        } catch (e) { statusExtra118 = []; }
        if (!Array.isArray(statusExtra117)) statusExtra117 = [];
        if (!Array.isArray(statusExtra118)) statusExtra118 = [];
    }

    function isFoglioSpeciale() {
        return foglioCorrente === "11.73import" || foglioCorrente === "1173import" || foglioCorrente === "11.71import";
    }

    function isFoglio118() {
        return foglioCorrente.startsWith("11.8") || foglioCorrente.startsWith("118");
    }

    /**
     * Modale 3 scelte per fogli 11.8x.
     * @returns {Promise<'chiasso'|'altra_dogana'|'annulla'>}
     */
    async function chiediConfermaChiasso(valoreRiferimento) {
        return new Promise(function(resolve) {
            let overlay = document.getElementById('modale-chiasso');
            let badge = document.getElementById('modale-chiasso-riferimento');
            let btnChiasso = document.getElementById('modale-btn-chiasso');
            let btnAltra = document.getElementById('modale-btn-altra');
            let btnAnnulla = document.getElementById('modale-btn-annulla');
            let btnX = document.getElementById('modale-chiasso-x');
            if (!overlay || !btnChiasso || !btnAltra || !btnAnnulla) {
                resolve('annulla');
                return;
            }

            badge.textContent = valoreRiferimento || '';
            overlay.style.display = 'flex';
            overlay.classList.add('modale-visibile');
            overlay.setAttribute('aria-hidden', 'false');

            function chiudi(esito) {
                overlay.classList.remove('modale-visibile');
                overlay.style.display = 'none';
                overlay.setAttribute('aria-hidden', 'true');
                btnChiasso.removeEventListener('click', onChiasso);
                btnAltra.removeEventListener('click', onAltra);
                btnAnnulla.removeEventListener('click', onAnnulla);
                if (btnX) btnX.removeEventListener('click', onAnnulla);
                overlay.removeEventListener('click', onOverlay);
                document.removeEventListener('keydown', onKey);
                resolve(esito);
            }

            function onChiasso() { chiudi('chiasso'); }
            function onAltra() { chiudi('altra_dogana'); }
            function onAnnulla() { chiudi('annulla'); }
            function onOverlay(e) {
                if (e.target === overlay) chiudi('annulla');
            }
            function onKey(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    chiudi('annulla');
                }
            }

            btnChiasso.addEventListener('click', onChiasso);
            btnAltra.addEventListener('click', onAltra);
            btnAnnulla.addEventListener('click', onAnnulla);
            if (btnX) btnX.addEventListener('click', onAnnulla);
            overlay.addEventListener('click', onOverlay);
            document.addEventListener('keydown', onKey);
            btnChiasso.focus();
        });
    }

    function isFoglio117() {
        return foglioCorrente.startsWith("11.7") || foglioCorrente.startsWith("117");
    }

    function getEtichettaExtra() {
        return document.getElementById('label-extra-nuovo').innerText || "Campo Extra";
    }

    function getStatusOptionsBase() {
        let base = isFoglio117() ? ["Aperto", "Chiuso"] : ["Parziale", "Completo"];
        let extra = isFoglio117() ? statusExtra117 : statusExtra118;
        return base.concat(extra.filter(s => s && !base.includes(s)));
    }

    function buildStatusSelectHTML(includeEmpty) {
        let html = includeEmpty ? '<option value="">-- Seleziona --</option>' : '';
        getStatusOptionsBase().forEach(s => { html += `<option value="${s}">${s}</option>`; });
        return html;
    }

    function buildPartnerSelectHTML(includeEmpty, emptyLabel) {
        const chiavi = Object.keys(contiPartner).filter(k => k !== "Altro").sort();
        if (contiPartner["Altro"] !== undefined) chiavi.push("Altro");
        let html = includeEmpty ? `<option value="">${emptyLabel || "-- Seleziona --"}</option>` : '';
        chiavi.forEach(p => { html += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`; });
        return html;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formattaDataISO(dataIta) {
        if (!dataIta) return "";
        let p = String(dataIta).split('/');
        return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : dataIta;
    }

    function formattaDataITA(dataIso) {
        if (!dataIso) return "";
        let p = String(dataIso).split('-');
        return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : dataIso;
    }

    function calcolaScadenzaDaISO(dataIso) {
        if (!dataIso) return "";
        let parti = dataIso.split('-');
        if (parti.length !== 3) return "";
        let anno = parseInt(parti[0], 10);
        let mese = parti[1];
        let giorno = parti[2];
        if (foglioCorrente === '11.73import' || foglioCorrente === '1173export') {
            anno += 2;
        } else if (foglioCorrente === '11.71import') {
            anno += 1;
        } else {
            return "";
        }
        return anno + "-" + mese + "-" + giorno;
    }

    function getColonneTabella() {
        let etichettaExtra = getEtichettaExtra();
        let cols = [
            { key: "numero", label: "Nr. Progressivo", tipo: "numero" },
            { key: "dataAll", label: "Data Allestimento", tipo: "data" },
        ];
        if (!isFoglio118()) {
            cols.push({ key: "dataScad", label: "Data Scadenza", tipo: "data" });
        }
        cols.push(
            { key: "partnerDogana", label: "Partner Dogana", tipo: "testo" },
            { key: "status", label: "Status", tipo: "testo" },
            { key: "campoExtra", label: etichettaExtra, tipo: "testo" }
        );
        if (isFoglioSpeciale()) {
            cols.push(
                { key: "nrConto", label: "Nr. Conto", tipo: "testo" },
                { key: "importoGarantito", label: "Importo Garantito", tipo: "importo" }
            );
        }
        cols.push(
            { key: "dataReg", label: "Data Reg.", tipo: "data" },
            { key: "oraReg", label: "Ora", tipo: "testo" },
            { key: "utente", label: "Utente", tipo: "testo" }
        );
        return cols;
    }

    function inizializzaDropdownPartners() {
        document.getElementById('n_partner_dogana').innerHTML = buildPartnerSelectHTML(true, "-- Seleziona --");
        document.getElementById('v_partner_dogana').innerHTML = buildPartnerSelectHTML(true, "-- Seleziona --");
        document.getElementById('c_partner_dogana').innerHTML = buildPartnerSelectHTML(true, "-- Tutti --");
    }

    function compilaContoAutomatico(prefisso) {
        if (foglioCorrente === "11.73import" || foglioCorrente === "11.71import" || foglioCorrente === "1173import") {
            let nomeSelezionato = document.getElementById(prefisso + 'partner_dogana').value;
            let campoConto = document.getElementById(prefisso + 'nr_conto');
            if (nomeSelezionato && contiPartner[nomeSelezionato]) {
                campoConto.value = contiPartner[nomeSelezionato];
            } else {
                campoConto.value = "";
            }
        }
    }

    function controllaUtenteObbligatorio() {
        let nomeUtente = localStorage.getItem("utenteDoganaMulti");
        while (!nomeUtente || nomeUtente.trim() === "") {
            nomeUtente = prompt("Inserisci il tuo Nome Utente per accedere al gestionale (Obbligatorio):");
            if (nomeUtente && nomeUtente.trim() !== "") {
                localStorage.setItem("utenteDoganaMulti", nomeUtente.trim());
            }
        }
        let campoUtente = document.getElementById("n_utente");
        if (campoUtente) {
            campoUtente.value = nomeUtente.trim();
        }
    }

    function cambiaUtente() {
        let attuale = localStorage.getItem("utenteDoganaMulti") || "";
        let nuovo = prompt("Nuovo nome utente:", attuale);
        if (nuovo === null) return;
        nuovo = nuovo.trim();
        if (!nuovo) {
            alert("Il nome utente non può essere vuoto.");
            return;
        }
        localStorage.setItem("utenteDoganaMulti", nuovo);
        let campoUtente = document.getElementById("n_utente");
        if (campoUtente) campoUtente.value = nuovo;
    }

    window.onload = function() { 
        caricaConfigLocale();
        inizializzaDropdownPartners(); 
        controllaUtenteObbligatorio();
        selezionaFoglio('11.73import'); 
    };

    function calcolaScadenza(prefisso) {
        let dataInput = document.getElementById(prefisso + 'data_allestimento').value;
        if (!dataInput) {
            let campoScadenza = document.getElementById(prefisso + 'data_scadenza');
            if (campoScadenza) campoScadenza.value = "";
            return; 
        }
        let parti = dataInput.split('-');
        let anno = parseInt(parti[0], 10);
        let mese = parti[1];
        let giorno = parti[2];
        if (foglioCorrente === '11.73import' || foglioCorrente === '1173export') {
            anno += 2; 
        } else if (foglioCorrente === '11.71import') {
            anno += 1; 
        } else {
            return;
        }
        document.getElementById(prefisso + 'data_scadenza').value = anno + "-" + mese + "-" + giorno;
    }

    function selezionaFoglio(nomeFoglio) {
        foglioCorrente = nomeFoglio;
        
        document.querySelectorAll('.sidebar .nav-btn').forEach(b => b.classList.remove('attivo'));
        document.getElementById('btn-foglio-' + nomeFoglio).classList.add('attivo');
        let btnFoglioAttivo = document.getElementById('btn-foglio-' + nomeFoglio);
        let nomeLeggibile = btnFoglioAttivo
            ? btnFoglioAttivo.innerText.replace(/^📄\s*/, '').trim()
            : nomeFoglio;
        document.getElementById('display-titolo-foglio').innerText = "Formulario: " + nomeLeggibile;

        let btnReport = document.getElementById('btn-report');
        if (nomeFoglio === '11.73import') {
            btnReport.style.display = 'inline-block';
        } else {
            btnReport.style.display = 'none';
        }

        let nomeCampoExtra = "";
        if (nomeFoglio === '11.73import') {
            nomeCampoExtra = "Scaricato con 11.87 export n°";
        } else if (nomeFoglio === '1173export') {
            nomeCampoExtra = "Scaricato con 11.87 import n°";
        } else if (nomeFoglio === '11.71import') {
            nomeCampoExtra = "Scaricato con 11.86 Export n°";
        } else if (nomeFoglio === '1187import') {
            nomeCampoExtra = "1173 export";
        } else if (nomeFoglio === '1187export') {
            nomeCampoExtra = "1173 import";
        } else if (nomeFoglio === '1186export') {
            nomeCampoExtra = "1171 import";
        } else {
            nomeCampoExtra = "Riferimento";
        }
        
        document.getElementById('label-extra-nuovo').innerText = nomeCampoExtra;
        document.getElementById('label-extra-cerca').innerText = "Cerca " + nomeCampoExtra;
        document.getElementById('label-extra-risultato').innerText = nomeCampoExtra;

        let is118 = isFoglio118();
        
        let optionsStatusHTML = buildStatusSelectHTML(true);
        document.getElementById('n_status').innerHTML = optionsStatusHTML;
        document.getElementById('v_status').innerHTML = optionsStatusHTML;

        let isSpeciale = isFoglioSpeciale();
        document.getElementById('blocco-speciali-nuovo').style.display = isSpeciale ? "flex" : "none";
        document.getElementById('blocco-speciali-risultato').style.display = isSpeciale ? "flex" : "none";

        document.getElementById('blocco-scadenza-nuovo').style.display = is118 ? "none" : "flex";
        document.getElementById('blocco-scadenza-risultato').style.display = is118 ? "none" : "flex";

        cambiaAzione('nuovo');
        svuotaTutto();
    }

    function cambiaAzione(azione) {
        document.querySelectorAll('.pagina').forEach(p => p.classList.remove('attiva'));
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('attivo'));
        let scheda = document.getElementById('scheda-' + azione);
        let btn = document.getElementById('btn-azione-' + azione);
        if (scheda) scheda.classList.add('attiva');
        if (btn) btn.classList.add('attivo');
    }

    function apriAdmin() {
        if (!richiediPasswordSessione("Password Admin:")) return;
        cambiaAzione('admin');
        renderAdminPartner();
        document.getElementById('admin-status-117').value = statusExtra117.join('\n');
        document.getElementById('admin-status-118').value = statusExtra118.join('\n');
        document.getElementById('msg-admin').innerText = '';
    }

    function svuotaTutto() {
        let oggi = new Date();
        let yyyy = oggi.getFullYear();
        let mm = String(oggi.getMonth() + 1).padStart(2, '0');
        let dd = String(oggi.getDate()).padStart(2, '0');
        document.getElementById('n_data_allestimento').value = yyyy + "-" + mm + "-" + dd;
        
        document.getElementById('n_partner_dogana').value = '';
        document.getElementById('n_status').value = '';
        document.getElementById('n_campo_extra').value = '';
        document.getElementById('n_nr_conto').value = '';
        document.getElementById('n_importo_garantito').value = '';
        document.getElementById('display-numero-nuovo').innerText = '...';
        document.getElementById('msg-nuovo').innerText = '';
        document.getElementById('btn-salva-nuovo').disabled = false;
        document.getElementById('btn-salva-nuovo').innerText = "Salva Formulario";
        
        document.getElementById('msg-modifica').innerText = '';
        document.getElementById('area-risultati').style.display = 'none';
        document.getElementById('msg-cerca').innerText = '';
        resetStatoTabella();
        
        calcolaScadenza('n_');
    }

    function resetStatoTabella() {
        tabellaModificabile = false;
        sortColonna = null;
        sortAsc = true;
        filtriTabella = {};
        indiciTabellaOrdinati = [];
        righeModificate = new Set();
        esitiRiga = {};
        vistaRisultati = 'scheda';
        let btnSblocca = document.getElementById('btn-sblocca-tabella');
        let btnSalvaTutte = document.getElementById('btn-salva-righe-modificate');
        if (btnSblocca) {
            btnSblocca.style.display = 'inline-block';
            btnSblocca.disabled = false;
            btnSblocca.innerText = "🔓 Sblocca Modifiche (Password)";
        }
        if (btnSalvaTutte) btnSalvaTutte.style.display = 'none';
        let msgTab = document.getElementById('msg-tabella');
        if (msgTab) msgTab.innerText = '';
    }

    async function generaReportPDF() {
        const btn = document.getElementById('btn-report');
        btn.disabled = true;
        btn.innerText = "⏳ Controllo in corso...";

        try {
            const risposta = await fetch(GOOGLE_SCRIPT_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify({ azione: "report", nomeFoglio: foglioCorrente }), 
                redirect: "follow" 
            });
            
            const testoPuro = await risposta.text();
            
            let risultato;
            try {
                risultato = JSON.parse(testoPuro);
            } catch (erroreJSON) {
                alert("🕵️‍♂️ DETECTIVE MODE!\n\nIl browser si è connesso a Google, ma Google non ha restituito i dati del Report. Ha risposto con questo testo imprevisto:\n\n" + testoPuro.substring(0, 300) + "\n\n(Se vedi del codice HTML o una pagina vuota, significa che su Google Apps Script devi ancora creare una 'Nuova Versione' del Deployment!)");
                
                btn.disabled = false;
                btn.innerText = "📊 Report Aperte (PDF)";
                return;
            }

            if (risultato.successo) {
                let dati = risultato.datiReport;
                if(dati.length === 0) {
                    alert("Nessun formulario Aperto trovato in questo foglio!");
                    btn.disabled = false; btn.innerText = "📊 Report Aperte (PDF)";
                    return;
                }

                let dataOggi = new Date().toLocaleDateString('it-CH');
                let htmlReport = `
                    <!DOCTYPE html>
                    <html lang="it">
                    <head>
                        <meta charset="UTF-8">
                        <title>Report Pratiche Aperte - 11.73 Import</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
                            h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #2980b9; padding-bottom: 10px; margin-bottom: 5px; }
                            .sottotitolo { text-align: center; color: #7f8c8d; font-style: italic; margin-bottom: 30px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #bdc3c7; padding: 10px 15px; text-align: left; }
                            th { background-color: #2980b9; color: white; font-weight: bold; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            .importo { text-align: right; font-weight: bold; color: #d35400; }
                            .centro { text-align: center; }
                            .riga-totale { font-size: 1.1rem; background-color: #ecf0f1; font-weight: bold; text-align: right; }
                        </style>
                    </head>
                    <body>
                        <h1>Tabella Pivot: Formulari 11.73 Import (Aperti)</h1>
                        <div class="sottotitolo">Generato il: ${dataOggi} - Ufficio Doganale Chiasso</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Partner Dogana</th>
                                    <th>Nr. Conto</th>
                                    <th class="centro">Numero Pratiche</th>
                                    <th class="importo">Importo Garantito (CHF)</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                let totaleAssoluto = 0;
                let conteggioTotale = 0;

                dati.forEach(riga => {
                    totaleAssoluto += riga.totale;
                    conteggioTotale += riga.conteggio;
                    let totaleFormattato = riga.totale.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    htmlReport += `
                        <tr>
                            <td>${riga.partner}</td>
                            <td>${riga.conto}</td>
                            <td class="centro">${riga.conteggio}</td>
                            <td class="importo">${totaleFormattato}</td>
                        </tr>
                    `;
                });

                let totaleAssolutoFormattato = totaleAssoluto.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                htmlReport += `
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2" class="riga-totale">TOTALE COMPLESSIVO:</td>
                                    <td class="riga-totale centro">${conteggioTotale}</td>
                                    <td class="riga-totale importo" style="color: #c0392b;">${totaleAssolutoFormattato}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </body>
                    </html>
                `;

                let finestraReport = window.open('', '_blank');
                finestraReport.document.write(htmlReport);
                finestraReport.document.close();

                setTimeout(() => {
                    finestraReport.print();
                }, 500);

            } else {
                alert("Errore dal server: " + risultato.messaggio);
            }
        } catch (e) {
            alert("Errore di rete puro: " + e.message);
        }
        
        btn.disabled = false;
        btn.innerText = "📊 Report Aperte (PDF)";
    }

    async function inviaDati(tipo) {
        const prefisso = (tipo === 'nuovo') ? 'n_' : 'v_';
        const btn = document.getElementById('btn-salva-' + tipo);
        const msg = document.getElementById('msg-' + tipo);
        const testoOriginaleBottone = (tipo === 'nuovo') ? "Salva Formulario" : "💾 Salva Modifiche";
        
        let rawAll = document.getElementById(prefisso+'data_allestimento').value;
        let rawScad = document.getElementById(prefisso+'data_scadenza') ? document.getElementById(prefisso+'data_scadenza').value : "";
        let dAll = rawAll ? rawAll.split('-').reverse().join('/') : "";
        let dScad = rawScad ? rawScad.split('-').reverse().join('/') : "";

        let datiDaSpedire = {
            azione: tipo,
            nomeFoglio: foglioCorrente,
            dataAllestimento: dAll,
            dataScadenza: dScad,
            partnerDogana: document.getElementById(prefisso+'partner_dogana').value,
            status: document.getElementById(prefisso+'status').value,
            campoExtra: document.getElementById(prefisso+'campo_extra').value,
            nrConto: document.getElementById(prefisso+'nr_conto') ? document.getElementById(prefisso+'nr_conto').value : "",
            importoGarantito: document.getElementById(prefisso+'importo_garantito') ? document.getElementById(prefisso+'importo_garantito').value : "",
            utente: document.getElementById('n_utente').value 
        };

        let is118 = isFoglio118();

        if (is118 && datiDaSpedire.campoExtra && datiDaSpedire.campoExtra.trim() !== "") {
            let esitoChiasso = await chiediConfermaChiasso(datiDaSpedire.campoExtra);
            if (esitoChiasso === 'annulla') {
                return;
            }
            if (esitoChiasso === 'altra_dogana') {
                datiDaSpedire.campoExtra = "";
                document.getElementById(prefisso+'campo_extra').value = "";
            }
            // 'chiasso' → mantieni campoExtra e prosegui
        }

        if (tipo === 'nuovo') {
            if (!datiDaSpedire.dataAllestimento || (!is118 && !datiDaSpedire.dataScadenza) || !datiDaSpedire.partnerDogana || !datiDaSpedire.status) {
                msg.style.color = "red"; msg.innerText = "Compila tutti i campi con l'asterisco rosso (*)!"; return; 
            }
            localStorage.setItem("utenteDoganaMulti", datiDaSpedire.utente);
        }

        if (tipo === 'modifica') {
            datiDaSpedire.numeroDaModificare = document.getElementById('v_numero').innerText;
            if (!datiDaSpedire.numeroDaModificare || datiDaSpedire.numeroDaModificare === "...") { msg.style.color="red"; msg.innerText = "Nessun record caricato da modificare!"; return; }
        }

        btn.disabled = true; 
        btn.innerText = "Attendere..."; 
        msg.innerHTML = "";

        try {
            const risposta = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datiDaSpedire), redirect: "follow" });
            const risultato = await risposta.json();

            if (risultato.successo) {
                msg.style.color = "green"; msg.innerText = risultato.messaggio;
                if(tipo === 'nuovo') { 
                    document.getElementById("display-numero-nuovo").innerText = risultato.numeroAssegnato; 
                    btn.disabled = true; btn.innerText = "Record Salvato"; 
                    setTimeout(() => { svuotaTutto(); msg.innerText = "Pronto per il prossimo!"; }, 3000); 
                } else {
                    btn.disabled = false; btn.innerText = testoOriginaleBottone;
                    if (risultatiRicerca[indiceCorrente]) {
                        risultatiRicerca[indiceCorrente].dataAll = datiDaSpedire.dataAllestimento;
                        risultatiRicerca[indiceCorrente].dataScad = datiDaSpedire.dataScadenza;
                        risultatiRicerca[indiceCorrente].partnerDogana = datiDaSpedire.partnerDogana;
                        risultatiRicerca[indiceCorrente].status = datiDaSpedire.status;
                        risultatiRicerca[indiceCorrente].campoExtra = datiDaSpedire.campoExtra;
                        risultatiRicerca[indiceCorrente].nrConto = datiDaSpedire.nrConto;
                        risultatiRicerca[indiceCorrente].importoGarantito = datiDaSpedire.importoGarantito;
                    }
                    if (document.getElementById("v_campo_extra").style.display === 'block') {
                        toggleModificaExtra();
                        costruisciListbox();
                    }
                    if (document.getElementById('area-risultati-tabella').style.display !== 'none') {
                        renderTabellaRisultati();
                    }
                }
            } else { 
                msg.style.color = "red"; 
                msg.innerText = risultato.messaggio; 
                btn.disabled = false; 
                btn.innerText = testoOriginaleBottone;
            }
        } catch (e) { 
            msg.style.color = "red"; 
            msg.innerText = "Errore di connessione."; 
            btn.disabled = false; 
            btn.innerText = testoOriginaleBottone;
        }
    }

    let risultatiRicerca = []; let indiceCorrente = 0;    
    
    async function avviaRicerca() {
        const btn = document.getElementById("btn-cerca");
        const msg = document.getElementById("msg-cerca");
        const area = document.getElementById("area-risultati");
        const datiSpediti = { azione: "cerca", nomeFoglio: foglioCorrente, cercaNumero: document.getElementById("c_numero").value, cercaPartnerDogana: document.getElementById("c_partner_dogana").value, cercaCampoExtra: document.getElementById("c_campo_extra").value };
        
        btn.disabled = true; btn.innerText = "Ricerca in corso..."; msg.innerHTML = ""; area.style.display = "none"; 
        resetStatoTabella();
        
        try {
            const risposta = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datiSpediti), redirect: "follow" });
            const risultato = await risposta.json();
            
            if (risultato.successo) {
                risultatiRicerca = risultato.risultati;
                if (risultatiRicerca.length === 0) { msg.innerHTML = "<span style='color:orange'>Nessun risultato trovato.</span>"; } 
                else {
                    msg.innerHTML = "";
                    indiceCorrente = 0;
                    mostraRecord();
                    area.style.display = "block";
                    if (passwordSessioneOk()) {
                        tabellaModificabile = true;
                        document.getElementById('btn-sblocca-tabella').style.display = 'none';
                        document.getElementById('btn-salva-righe-modificate').style.display = 'inline-block';
                    }
                    impostaVistaRisultati(vistaRisultati || 'scheda');
                    renderTabellaRisultati();
                }
            } else { msg.style.color = "red"; msg.innerText = risultato.messaggio; }
        } catch (e) { msg.style.color = "red"; msg.innerText = "Errore di rete."; }
        btn.disabled = false; btn.innerText = "Trova Formulari";
    }

    function toggleModificaExtra() {
        let inputExtra = document.getElementById("v_campo_extra");
        let listboxExtra = document.getElementById("v_campo_extra_list");
        let btnMatita = document.getElementById("btn-toggle-extra");

        if (inputExtra.style.display === 'none') {
            inputExtra.style.display = 'block';
            listboxExtra.style.display = 'none';
            btnMatita.innerText = "❌"; 
            btnMatita.title = "Annulla modifica testo";
        } else {
            inputExtra.style.display = 'none';
            listboxExtra.style.display = 'block';
            btnMatita.innerText = "✏️";
            btnMatita.title = "Modifica Testo";
            inputExtra.value = risultatiRicerca[indiceCorrente].campoExtra;
        }
    }

    function costruisciListbox() {
        let inputExtra = document.getElementById("v_campo_extra");
        let listboxExtra = document.getElementById("v_campo_extra_list");
        
        let valPulito = inputExtra.value.replace(/^'/, '');
        
        let arrayValori = valPulito ? valPulito.split('/') : [];
        let opzioniHTML = "";
        arrayValori.forEach(v => {
            if(v.trim()) opzioniHTML += `<option value="${v.trim()}">${v.trim()}</option>`;
        });
        if(opzioniHTML === "") opzioniHTML = "<option disabled>Nessuno scarico</option>";
        listboxExtra.innerHTML = opzioniHTML;
        
        risultatiRicerca[indiceCorrente].campoExtra = inputExtra.value;
    }

    function mostraRecord() {
        const rec = risultatiRicerca[indiceCorrente]; 
        
        function formattaData(dataIta) { if(!dataIta) return ""; let p = dataIta.split('/'); return p.length===3 ? p[2]+"-"+p[1]+"-"+p[0] : dataIta; }

        document.getElementById("v_numero").innerText = rec.numero;
        document.getElementById("v_data_allestimento").value = formattaData(rec.dataAll);
        document.getElementById("v_data_scadenza").value = formattaData(rec.dataScad);
        
        let selPartner = document.getElementById("v_partner_dogana");
        let opzioniPartner = Array.from(selPartner.options).map(opt => opt.value);
        if (rec.partnerDogana && !opzioniPartner.includes(rec.partnerDogana)) {
            selPartner.add(new Option(rec.partnerDogana, rec.partnerDogana));
        }
        selPartner.value = rec.partnerDogana;

        let selStatus = document.getElementById("v_status");
        let opzioniStatus = Array.from(selStatus.options).map(opt => opt.value);
        if (rec.status && !opzioniStatus.includes(rec.status)) {
            selStatus.add(new Option(rec.status, rec.status));
        }
        selStatus.value = rec.status;

        let inputExtra = document.getElementById("v_campo_extra");
        let listboxExtra = document.getElementById("v_campo_extra_list");
        let btnMatita = document.getElementById("btn-toggle-extra");
        
        inputExtra.value = rec.campoExtra; 
        
        if (foglioCorrente.startsWith("11.7") || foglioCorrente.startsWith("117")) {
            inputExtra.style.display = 'none';
            listboxExtra.style.display = 'block';
            btnMatita.style.display = 'inline-block'; 
            btnMatita.innerText = "✏️";
            
            costruisciListbox();
        } else {
            inputExtra.style.display = 'block';
            listboxExtra.style.display = 'none';
            btnMatita.style.display = 'none'; 
        }

        document.getElementById("v_dataReg").innerText = rec.dataReg;
        document.getElementById("v_oraReg").innerText = rec.oraReg;
        document.getElementById("v_utente").innerText = rec.utente;

        let isSpeciale = (foglioCorrente === "11.73import" || foglioCorrente === "1173import" || foglioCorrente === "11.71import");
        if(isSpeciale) {
            document.getElementById("v_nr_conto").value = rec.nrConto;
            document.getElementById("v_importo_garantito").value = rec.importoGarantito;
        }

        document.getElementById("testo-contatore").innerText = `Record ${indiceCorrente + 1} di ${risultatiRicerca.length}`;
        document.getElementById("btn-indietro").disabled = (indiceCorrente === 0);
        document.getElementById("btn-avanti").disabled = (indiceCorrente === risultatiRicerca.length - 1);
        
        document.getElementById('msg-modifica').innerText = '';
    }
    
    function vaiAvanti() { if (indiceCorrente < risultatiRicerca.length - 1) { indiceCorrente++; mostraRecord(); } }
    function vaiIndietro() { if (indiceCorrente > 0) { indiceCorrente--; mostraRecord(); } }

    function esportaCSV() {
        if (risultatiRicerca.length === 0) { alert("Nessun record da esportare!"); return; }
        
        let isSpeciale = isFoglioSpeciale();
        let is118 = isFoglio118();
        
        let etichettaExtra = getEtichettaExtra();
        let contenutoCSV = "";
        
        if (isSpeciale) {
            contenutoCSV = `Nr. Progressivo;Data Allestimento;Data Scadenza;Partner Dogana;Status;${etichettaExtra};Data Registrazione;Nr. Conto;Importo garantito;Ora;Utente\n`;
            risultatiRicerca.forEach(rec => {
                let riga = [ rec.numero, rec.dataAll, rec.dataScad, rec.partnerDogana, rec.status, rec.campoExtra, rec.dataReg, rec.nrConto, rec.importoGarantito, rec.oraReg, rec.utente ];
                contenutoCSV += riga.join(";") + "\n";
            });
        } else if (is118) {
            contenutoCSV = `Nr. Progressivo;Data Allestimento;Partner Dogana;Status;${etichettaExtra};Data Registrazione;Ora;Utente\n`;
            risultatiRicerca.forEach(rec => {
                let riga = [ rec.numero, rec.dataAll, rec.partnerDogana, rec.status, rec.campoExtra, rec.dataReg, rec.oraReg, rec.utente ];
                contenutoCSV += riga.join(";") + "\n";
            });
        } else {
            contenutoCSV = `Nr. Progressivo;Data Allestimento;Data Scadenza;Partner Dogana;Status;${etichettaExtra};Data Registrazione;Ora;Utente\n`;
            risultatiRicerca.forEach(rec => {
                let riga = [ rec.numero, rec.dataAll, rec.dataScad, rec.partnerDogana, rec.status, rec.campoExtra, rec.dataReg, rec.oraReg, rec.utente ];
                contenutoCSV += riga.join(";") + "\n";
            });
        }
        
        const fileVirtuale = new Blob([contenutoCSV], { type: 'text/csv;charset=utf-8;' });
        const linkDownload = document.createElement("a");
        const urlFile = URL.createObjectURL(fileVirtuale);
        linkDownload.setAttribute("href", urlFile);
        linkDownload.setAttribute("download", `Estrazione_${foglioCorrente}.csv`); 
        linkDownload.style.visibility = 'hidden';
        document.body.appendChild(linkDownload);
        linkDownload.click(); 
        document.body.removeChild(linkDownload);
    }

    // ========== VISTA TABELLA ==========

    function impostaVistaRisultati(vista) {
        vistaRisultati = vista;
        let scheda = document.getElementById('area-risultati-maschera');
        let tabella = document.getElementById('area-risultati-tabella');
        document.getElementById('btn-vista-scheda').classList.toggle('attivo', vista === 'scheda');
        document.getElementById('btn-vista-tabella').classList.toggle('attivo', vista === 'tabella');
        scheda.style.display = (vista === 'scheda') ? 'block' : 'none';
        tabella.style.display = (vista === 'tabella') ? 'block' : 'none';
        if (vista === 'tabella') renderTabellaRisultati();
    }

    function sbloccaModificheTabella() {
        if (!richiediPasswordSessione("Password per sbloccare le modifiche in tabella:")) return;
        tabellaModificabile = true;
        document.getElementById('btn-sblocca-tabella').style.display = 'none';
        document.getElementById('btn-salva-righe-modificate').style.display = 'inline-block';
        document.getElementById('msg-tabella').style.color = '#27ae60';
        document.getElementById('msg-tabella').innerText = 'Modifiche sbloccate.';
        renderTabellaRisultati();
    }

    function parseValoreSort(val, tipo) {
        if (val === null || val === undefined || val === "") return tipo === "testo" ? "" : null;
        if (tipo === "numero" || tipo === "importo") {
            let n = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
            return isNaN(n) ? null : n;
        }
        if (tipo === "data") {
            let s = String(val);
            if (s.indexOf('/') !== -1) {
                let p = s.split('/');
                if (p.length === 3) return new Date(parseInt(p[2],10), parseInt(p[1],10)-1, parseInt(p[0],10)).getTime();
            }
            if (s.indexOf('-') !== -1) {
                let p = s.split('-');
                if (p.length === 3) return new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10)).getTime();
            }
            return null;
        }
        return String(val).toLowerCase();
    }

    function confrontaSort(a, b, tipo) {
        let va = parseValoreSort(a, tipo);
        let vb = parseValoreSort(b, tipo);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        if (typeof va === "string") return va.localeCompare(vb, 'it');
        return va < vb ? -1 : (va > vb ? 1 : 0);
    }

    function getIndiciFiltratiOrdinati() {
        let cols = getColonneTabella();
        let indici = risultatiRicerca.map((_, i) => i);
        indici = indici.filter(i => {
            let rec = risultatiRicerca[i];
            return cols.every(col => {
                let f = filtriTabella[col.key];
                if (!f) return true;
                let val = String(rec[col.key] == null ? "" : rec[col.key]).toLowerCase();
                return val.indexOf(String(f).toLowerCase()) !== -1;
            });
        });
        if (sortColonna) {
            let colDef = cols.find(c => c.key === sortColonna);
            let tipo = colDef ? colDef.tipo : "testo";
            indici.sort((ia, ib) => {
                let cmp = confrontaSort(risultatiRicerca[ia][sortColonna], risultatiRicerca[ib][sortColonna], tipo);
                return sortAsc ? cmp : -cmp;
            });
        }
        return indici;
    }

    function ordinaPerColonna(key) {
        if (sortColonna === key) {
            sortAsc = !sortAsc;
        } else {
            sortColonna = key;
            sortAsc = true;
        }
        renderTabellaRisultati();
    }

    function aggiornaFiltroColonna(key, valore) {
        if (!valore) delete filtriTabella[key];
        else filtriTabella[key] = valore;
        renderTabellaRisultati(key);
    }

    function clickRigaTabella(evt, idx) {
        if (evt.target.closest('input, select, button, .esito-riga')) return;
        apriSchedaDaTabella(idx);
    }

    function marcaRigaModificata(idx) {
        righeModificate.add(idx);
        delete esitiRiga[idx];
        let tr = document.querySelector('tr[data-idx="' + idx + '"]');
        if (tr) {
            tr.classList.add('riga-modificata');
            tr.classList.remove('riga-ok', 'riga-err');
            let esito = tr.querySelector('.esito-riga');
            if (esito) esito.innerText = '';
        }
    }

    function onChangeCellaTabella(idx, key, valore) {
        if (!risultatiRicerca[idx]) return;
        risultatiRicerca[idx][key] = valore;
        if (key === 'dataAll' && !isFoglio118()) {
            let scadIso = calcolaScadenzaDaISO(formattaDataISO(valore) || valore);
            if (scadIso) {
                risultatiRicerca[idx].dataScad = formattaDataITA(scadIso);
                let inp = document.querySelector('tr[data-idx="' + idx + '"] input[data-field="dataScad"]');
                if (inp) inp.value = scadIso;
            }
        }
        if (key === 'partnerDogana' && isFoglioSpeciale()) {
            let conto = contiPartner[valore] || "";
            risultatiRicerca[idx].nrConto = conto;
            let inp = document.querySelector('tr[data-idx="' + idx + '"] input[data-field="nrConto"]');
            if (inp) inp.value = conto;
        }
        marcaRigaModificata(idx);
    }

    function apriSchedaDaTabella(idx) {
        if (idx < 0 || idx >= risultatiRicerca.length) return;
        indiceCorrente = idx;
        mostraRecord();
        impostaVistaRisultati('scheda');
    }

    function renderTabellaRisultati(focusFiltroKey) {
        let thead = document.getElementById('thead-risultati');
        let tbody = document.getElementById('tbody-risultati');
        if (!thead || !tbody) return;
        let cols = getColonneTabella();
        indiciTabellaOrdinati = getIndiciFiltratiOrdinati();

        let headerHtml = '<tr>';
        cols.forEach(col => {
            let ind = '';
            if (sortColonna === col.key) ind = '<span class="sort-ind">' + (sortAsc ? '▲' : '▼') + '</span>';
            headerHtml += '<th onclick="ordinaPerColonna(\'' + col.key + '\')">' + escapeHtml(col.label) + ind + '</th>';
        });
        headerHtml += '<th style="cursor:default;">Azioni</th></tr>';

        headerHtml += '<tr class="filtri-riga">';
        cols.forEach(col => {
            let val = filtriTabella[col.key] || '';
            if (col.key === 'status') {
                let opts = '<option value="">Tutti</option>';
                getStatusOptionsBase().forEach(s => {
                    opts += '<option value="' + escapeHtml(s) + '"' + (val === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
                });
                headerHtml += '<th><select data-filtro="' + col.key + '" onchange="aggiornaFiltroColonna(\'' + col.key + '\', this.value)">' + opts + '</select></th>';
            } else if (col.key === 'partnerDogana') {
                let opts = '<option value="">Tutti</option>';
                Object.keys(contiPartner).filter(k => k !== 'Altro').sort().concat(contiPartner['Altro'] !== undefined ? ['Altro'] : []).forEach(p => {
                    opts += '<option value="' + escapeHtml(p) + '"' + (val === p ? ' selected' : '') + '>' + escapeHtml(p) + '</option>';
                });
                headerHtml += '<th><select data-filtro="' + col.key + '" onchange="aggiornaFiltroColonna(\'' + col.key + '\', this.value)">' + opts + '</select></th>';
            } else {
                headerHtml += '<th><input type="text" data-filtro="' + col.key + '" value="' + escapeHtml(val) + '" placeholder="Filtra..." oninput="aggiornaFiltroColonna(\'' + col.key + '\', this.value)"></th>';
            }
        });
        headerHtml += '<th></th></tr>';
        thead.innerHTML = headerHtml;

        let bodyHtml = '';
        let editabili = { dataAll: true, dataScad: true, partnerDogana: true, status: true, campoExtra: true, nrConto: true, importoGarantito: true };

        indiciTabellaOrdinati.forEach(idx => {
            let rec = risultatiRicerca[idx];
            let classi = [];
            if (righeModificate.has(idx)) classi.push('riga-modificata');
            if (esitiRiga[idx] && esitiRiga[idx].ok) classi.push('riga-ok');
            if (esitiRiga[idx] && esitiRiga[idx].ok === false) classi.push('riga-err');
            bodyHtml += '<tr data-idx="' + idx + '" class="' + classi.join(' ') + '" onclick="clickRigaTabella(event,' + idx + ')">';
            cols.forEach(col => {
                let val = rec[col.key] == null ? "" : rec[col.key];
                if (tabellaModificabile && editabili[col.key]) {
                    if (col.key === 'partnerDogana') {
                        bodyHtml += '<td><select data-field="partnerDogana" onchange="onChangeCellaTabella(' + idx + ',\'partnerDogana\', this.value)"></select></td>';
                    } else if (col.key === 'status') {
                        let opts = buildStatusSelectHTML(true);
                        if (val && opts.indexOf('value="' + escapeHtml(val) + '"') === -1) {
                            opts += '<option value="' + escapeHtml(val) + '">' + escapeHtml(val) + '</option>';
                        }
                        bodyHtml += '<td><select data-field="status" onchange="onChangeCellaTabella(' + idx + ',\'status\', this.value)">' + opts + '</select></td>';
                    } else if (col.tipo === 'data') {
                        let iso = formattaDataISO(val);
                        bodyHtml += '<td><input type="date" data-field="' + col.key + '" value="' + escapeHtml(iso) + '" onchange="onChangeCellaTabella(' + idx + ',\'' + col.key + '\', formattaDataITA(this.value))"></td>';
                    } else if (col.key === 'importoGarantito') {
                        bodyHtml += '<td><input type="number" step="0.01" data-field="importoGarantito" value="' + escapeHtml(val) + '" onchange="onChangeCellaTabella(' + idx + ',\'importoGarantito\', this.value)"></td>';
                    } else {
                        bodyHtml += '<td><input type="text" data-field="' + col.key + '" value="' + escapeHtml(val) + '" onchange="onChangeCellaTabella(' + idx + ',\'' + col.key + '\', this.value)"></td>';
                    }
                } else {
                    bodyHtml += '<td>' + escapeHtml(val) + '</td>';
                }
            });
            let esitoTxt = esitiRiga[idx] ? esitiRiga[idx].msg : '';
            let esitoCol = esitiRiga[idx] ? (esitiRiga[idx].ok ? 'green' : 'red') : '';
            bodyHtml += '<td>';
            bodyHtml += '<button type="button" class="btn-riga apri" onclick="event.stopPropagation(); apriSchedaDaTabella(' + idx + ')">Apri scheda</button>';
            if (tabellaModificabile) {
                bodyHtml += '<button type="button" class="btn-riga salva" onclick="event.stopPropagation(); salvaRigaTabella(' + idx + ')">💾 Salva</button>';
            }
            bodyHtml += '<div class="esito-riga" style="color:' + esitoCol + '">' + escapeHtml(esitoTxt) + '</div>';
            bodyHtml += '</td></tr>';
        });

        if (indiciTabellaOrdinati.length === 0) {
            bodyHtml = '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;color:#7f8c8d;">Nessuna riga corrisponde ai filtri.</td></tr>';
        }
        tbody.innerHTML = bodyHtml;

        if (tabellaModificabile) {
            tbody.querySelectorAll('select[data-field="partnerDogana"]').forEach(sel => {
                let tr = sel.closest('tr');
                let idx = parseInt(tr.getAttribute('data-idx'), 10);
                let val = risultatiRicerca[idx].partnerDogana || "";
                sel.innerHTML = buildPartnerSelectHTML(true, "-- Seleziona --");
                if (val && !Array.from(sel.options).some(o => o.value === val)) {
                    sel.add(new Option(val, val));
                }
                sel.value = val;
            });
            tbody.querySelectorAll('select[data-field="status"]').forEach(sel => {
                let tr = sel.closest('tr');
                let idx = parseInt(tr.getAttribute('data-idx'), 10);
                sel.value = risultatiRicerca[idx].status || "";
            });
        }

        if (focusFiltroKey) {
            let el = thead.querySelector('[data-filtro="' + focusFiltroKey + '"]');
            if (el) {
                el.focus();
                if (el.tagName === 'INPUT' && typeof el.setSelectionRange === 'function') {
                    let len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            }
        }
    }

    function costruisciPayloadModificaDaRecord(rec) {
        return {
            azione: "modifica",
            nomeFoglio: foglioCorrente,
            numeroDaModificare: rec.numero,
            dataAllestimento: rec.dataAll || "",
            dataScadenza: isFoglio118() ? "" : (rec.dataScad || ""),
            partnerDogana: rec.partnerDogana || "",
            status: rec.status || "",
            campoExtra: rec.campoExtra || "",
            nrConto: isFoglioSpeciale() ? (rec.nrConto || "") : "",
            importoGarantito: isFoglioSpeciale() ? (rec.importoGarantito || "") : "",
            utente: document.getElementById('n_utente').value || localStorage.getItem("utenteDoganaMulti") || ""
        };
    }

    /** @returns {Promise<'chiasso'|'altra_dogana'|'annulla'|'skip'>} */
    async function applicaEsitoChiassoSuPayload(datiDaSpedire, rec) {
        if (!(isFoglio118() && datiDaSpedire.campoExtra && datiDaSpedire.campoExtra.trim() !== "")) {
            return 'skip';
        }
        let esito = await chiediConfermaChiasso(datiDaSpedire.campoExtra);
        if (esito === 'annulla') return 'annulla';
        if (esito === 'altra_dogana') {
            datiDaSpedire.campoExtra = "";
            if (rec) rec.campoExtra = "";
        }
        return esito;
    }

    async function salvaRigaTabella(idx) {
        let rec = risultatiRicerca[idx];
        if (!rec) return;
        let msgTab = document.getElementById('msg-tabella');
        let datiDaSpedire = costruisciPayloadModificaDaRecord(rec);
        let esitoChiasso = await applicaEsitoChiassoSuPayload(datiDaSpedire, rec);
        if (esitoChiasso === 'annulla') return;

        try {
            const risposta = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datiDaSpedire), redirect: "follow" });
            const risultato = await risposta.json();
            if (risultato.successo) {
                righeModificate.delete(idx);
                esitiRiga[idx] = { ok: true, msg: risultato.messaggio || "Salvato" };
                risultatiRicerca[idx].campoExtra = datiDaSpedire.campoExtra;
                if (msgTab) { msgTab.style.color = "green"; msgTab.innerText = "Riga " + rec.numero + " salvata."; }
            } else {
                esitiRiga[idx] = { ok: false, msg: risultato.messaggio || "Errore" };
                if (msgTab) { msgTab.style.color = "red"; msgTab.innerText = risultato.messaggio; }
            }
        } catch (e) {
            esitiRiga[idx] = { ok: false, msg: "Errore di connessione" };
            if (msgTab) { msgTab.style.color = "red"; msgTab.innerText = "Errore di connessione."; }
        }
        renderTabellaRisultati();
    }

    async function salvaRigheModificate() {
        let daSalvare = Array.from(righeModificate);
        if (daSalvare.length === 0) {
            alert("Nessuna riga modificata da salvare.");
            return;
        }
        let msgTab = document.getElementById('msg-tabella');
        let btn = document.getElementById('btn-salva-righe-modificate');
        btn.disabled = true;
        btn.innerText = "Salvataggio...";
        let ok = 0, err = 0, skip = 0;
        for (let idx of daSalvare) {
            let rec = risultatiRicerca[idx];
            if (!rec) continue;
            let datiDaSpedire = costruisciPayloadModificaDaRecord(rec);
            let esitoChiasso = await applicaEsitoChiassoSuPayload(datiDaSpedire, rec);
            if (esitoChiasso === 'annulla') {
                skip++;
                continue;
            }
            try {
                const risposta = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(datiDaSpedire), redirect: "follow" });
                const risultato = await risposta.json();
                if (risultato.successo) {
                    righeModificate.delete(idx);
                    esitiRiga[idx] = { ok: true, msg: risultato.messaggio || "Salvato" };
                    risultatiRicerca[idx].campoExtra = datiDaSpedire.campoExtra;
                    ok++;
                } else {
                    esitiRiga[idx] = { ok: false, msg: risultato.messaggio || "Errore" };
                    err++;
                }
            } catch (e) {
                esitiRiga[idx] = { ok: false, msg: "Errore di connessione" };
                err++;
            }
        }
        btn.disabled = false;
        btn.innerText = "💾 Salva Righe Modificate";
        if (msgTab) {
            msgTab.style.color = err ? "red" : "green";
            msgTab.innerText = "Salvate: " + ok + (err ? " — Errori: " + err : "") + (skip ? " — Annullate: " + skip : "");
        }
        renderTabellaRisultati();
    }

    // ========== ADMIN ==========

    function renderAdminPartner() {
        let tbody = document.getElementById('tbody-admin-partner');
        let chiavi = Object.keys(contiPartner).filter(k => k !== "Altro").sort();
        if (contiPartner["Altro"] !== undefined) chiavi.push("Altro");
        tbody.innerHTML = '';
        chiavi.forEach((nome, i) => {
            let tr = document.createElement('tr');
            tr.innerHTML =
                '<td><input type="text" class="admin-partner-nome" value="' + escapeHtml(nome) + '"></td>' +
                '<td><input type="text" class="admin-partner-conto" value="' + escapeHtml(contiPartner[nome] || '') + '"></td>' +
                '<td><button type="button" class="btn-riga" onclick="eliminaRigaPartnerAdmin(this)">🗑️</button></td>';
            tbody.appendChild(tr);
        });
    }

    function aggiungiRigaPartnerAdmin() {
        let tbody = document.getElementById('tbody-admin-partner');
        let tr = document.createElement('tr');
        tr.innerHTML =
            '<td><input type="text" class="admin-partner-nome" value="" placeholder="Nome partner"></td>' +
            '<td><input type="text" class="admin-partner-conto" value="" placeholder="Nr. conto"></td>' +
            '<td><button type="button" class="btn-riga" onclick="eliminaRigaPartnerAdmin(this)">🗑️</button></td>';
        tbody.appendChild(tr);
    }

    function eliminaRigaPartnerAdmin(btn) {
        let tr = btn.closest('tr');
        if (tr) tr.remove();
    }

    function leggiPartnerDaAdmin() {
        let obj = {};
        document.querySelectorAll('#tbody-admin-partner tr').forEach(tr => {
            let nome = (tr.querySelector('.admin-partner-nome') || {}).value;
            let conto = (tr.querySelector('.admin-partner-conto') || {}).value;
            if (nome && nome.trim()) {
                obj[nome.trim()] = (conto || "").trim();
            }
        });
        return obj;
    }

    function parseStatusTextarea(id) {
        return document.getElementById(id).value
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    function salvaAdmin() {
        let nuoviPartner = leggiPartnerDaAdmin();
        if (Object.keys(nuoviPartner).length === 0) {
            alert("Inserisci almeno un partner.");
            return;
        }
        contiPartner = nuoviPartner;
        statusExtra117 = parseStatusTextarea('admin-status-117');
        statusExtra118 = parseStatusTextarea('admin-status-118');

        localStorage.setItem(LS_CONTI_PARTNER, JSON.stringify(contiPartner));
        localStorage.setItem(LS_STATUS_117, JSON.stringify(statusExtra117));
        localStorage.setItem(LS_STATUS_118, JSON.stringify(statusExtra118));

        inizializzaDropdownPartners();
        selezionaFoglio(foglioCorrente);
        apriAdmin();
        let msg = document.getElementById('msg-admin');
        msg.style.color = "green";
        msg.innerText = "Configurazione salvata. Dropdown aggiornati.";
    }

    function ripristinaDefaultAdmin() {
        if (!confirm("Ripristinare partner e status extra ai valori di default del codice?")) return;
        localStorage.removeItem(LS_CONTI_PARTNER);
        localStorage.removeItem(LS_STATUS_117);
        localStorage.removeItem(LS_STATUS_118);
        contiPartner = Object.assign({}, contiPartnerDefault);
        statusExtra117 = [];
        statusExtra118 = [];
        inizializzaDropdownPartners();
        selezionaFoglio(foglioCorrente);
        apriAdmin();
        let msg = document.getElementById('msg-admin');
        msg.style.color = "#2980b9";
        msg.innerText = "Default ripristinati.";
    }

    function copiaContiPartnerClipboard() {
        let obj = leggiPartnerDaAdmin();
        let linee = Object.keys(obj).map(k => '        "' + k.replace(/"/g, '\\"') + '": "' + String(obj[k]).replace(/"/g, '\\"') + '"');
        let blocco = "const contiPartner = {\n" + linee.join(",\n") + "\n    };";
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(blocco).then(() => {
                let msg = document.getElementById('msg-admin');
                msg.style.color = "green";
                msg.innerText = "Oggetto contiPartner copiato negli appunti.";
            }).catch(() => {
                prompt("Copia manualmente:", blocco);
            });
        } else {
            prompt("Copia manualmente:", blocco);
        }
    }
