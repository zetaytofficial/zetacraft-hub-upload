export default {
  async fetch(request, env) {
    // CORS per far funzionare dal tuo sito
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
      return new Response("Usa POST", { status: 405 });
    }

    try {
      const formData = await request.formData();
      const nome = formData.get('nome'); // es. ZetaYT
      let fileBuffer;
      let fileName = "logo.webp";

      // CASO 1: file dal dispositivo
      const file = formData.get('file');
      if (file && file.size > 0) {
        fileBuffer = await file.arrayBuffer();
      } 
      // CASO 2: da URL
      else {
        const imageUrl = formData.get('url');
        if (!imageUrl) return new Response("Manca file o url", { status: 400 });
        const res = await fetch(imageUrl);
        fileBuffer = await res.arrayBuffer();
      }

      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // Carica su zetacraft-hub-upload
      const githubRes = await fetch(`https://api.github.com/repos/TUO_GITHUB_USERNAME/zetacraft-hub-upload/contents/${nome}/${fileName}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "ZetaCraft-Worker"
        },
        body: JSON.stringify({
          message: `Upload logo ${nome}`,
          content: base64
        })
      });

      if (!githubRes.ok) {
        const err = await githubRes.text();
        return new Response(`Errore GitHub: ${err}`, { status: 500 });
      }

      return new Response(JSON.stringify({ ok: true, path: `${nome}/${fileName}` }), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response(`Errore: ${e.message}`, { status: 500 });
    }
  }
}
