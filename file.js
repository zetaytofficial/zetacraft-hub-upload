export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Usa POST", { status: 405, headers: cors });

    try {
      const formData = await request.formData();
      const nomeRaw = formData.get('nome')?.trim();
      if (!nomeRaw) return new Response("Manca nome", { status: 400, headers: cors });
      
      // Pulisci nome: niente spazi, niente caratteri strani
      const nome = nomeRaw.replace(/[^a-zA-Z0-9-_]/g, '');
      const tipo = formData.get('tipo') === 'banner' ? 'banner' : 'logo';
      
      let fileBuffer;
      const file = formData.get('file');
      if (file && file.size > 0) {
        fileBuffer = await file.arrayBuffer();
      } else {
        const imageUrl = formData.get('url');
        if (!imageUrl) return new Response("Manca file o url", { status: 400, headers: cors });
        const r = await fetch(imageUrl);
        fileBuffer = await r.arrayBuffer();
      }

      // Conversione Base64 a chunk (fixa Maximum call stack)
      let binary = '';
      const bytes = new Uint8Array(fileBuffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const fileName = `${tipo}.webp`;
      const repo = `${env.GITHUB_USERNAME}/zetacraft-hub-upload`;
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${nome}/${fileName}`;

      // 1. Prova a prendere lo SHA se il file esiste già
      let sha = undefined;
      try {
        const checkRes = await fetch(apiUrl, {
          headers: { "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "ZetaCraft", "Accept": "application/vnd.github.v3+json" }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          sha = checkData.sha;
        }
      } catch (e) { /* ignora, è un file nuovo */ }

      // 2. Carica / Sovrascrivi
      const payload = {
        message: `Upload ${fileName} per ${nome}`,
        content: base64
      };
      if (sha) payload.sha = sha; // <--- QUESTO FIXA IL TUO ERRORE

      const githubRes = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "ZetaCraft" },
        body: JSON.stringify(payload)
      });

      if (!githubRes.ok) {
        const errText = await githubRes.text();
        // Se GitHub dice ancora che manca SHA, prova a recuperarlo e riprova
        if (errText.includes('sha')) {
          return new Response(`Errore GitHub: file già esistente, riprovo. Cancella manualmente ${nome}/${fileName} su GitHub e riprova, oppure dimmi. Dettaglio: ${errText}`, { status: 500, headers: cors });
        }
        return new Response(`Errore GitHub: ${errText}`, { status: 500, headers: cors });
      }

      return new Response(JSON.stringify({ ok: true, url: `https://raw.githubusercontent.com/${repo}/main/${nome}/${fileName}` }), { headers: { "Content-Type": "application/json", ...cors } });

    } catch (e) {
      return new Response(`Errore Worker: ${e.message}`, { status: 500, headers: cors });
    }
  }
}
