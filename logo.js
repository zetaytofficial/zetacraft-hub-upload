export default {
  async fetch(request, env) {
    // Per far funzionare dal tuo sito
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Usa POST per caricare", { status: 405 });
    }

    try {
      const formData = await request.formData();
      const nome = formData.get('nome'); 
      if (!nome) return new Response("Manca il nome", { status: 400 });
      
      let fileBuffer;

      // 1. Da file caricato
      const file = formData.get('file');
      if (file && file.size > 0) {
        fileBuffer = await file.arrayBuffer();
      } 
      // 2. Da URL
      else {
        const imageUrl = formData.get('url');
        if (!imageUrl) return new Response("Manca file o url", { status: 400 });
        const res = await fetch(imageUrl);
        if (!res.ok) return new Response("Impossibile scaricare URL", { status: 400 });
        fileBuffer = await res.arrayBuffer();
      }

      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // Carica su GitHub
      const githubRes = await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/zetacraft-hub-upload/contents/${nome}/logo.webp`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "ZetaCraft-Worker"
        },
        body: JSON.stringify({
          message: `Upload logo per ${nome}`,
          content: base64
        })
      });

      if (!githubRes.ok) {
        const err = await githubRes.text();
        return new Response(`Errore GitHub: ${err}`, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }

      return new Response(JSON.stringify({ ok: true, path: `${nome}/logo.webp` }), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response(`Errore: ${e.message}`, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  }
}
