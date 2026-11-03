export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    if (request.method !== "POST") return new Response("Usa POST", { status: 405 });

    try {
      const formData = await request.formData();
      const nome = formData.get('nome');
      let fileBuffer;

      const file = formData.get('file');
      if (file && file.size > 0) {
        fileBuffer = await file.arrayBuffer();
      } else {
        const imageUrl = formData.get('url');
        if (!imageUrl) return new Response("Manca file o url", { status: 400 });
        const res = await fetch(imageUrl);
        fileBuffer = await res.arrayBuffer();
      }

      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // USA LE VARIABILI
      await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/zetacraft-hub-upload/contents/${nome}/logo.webp`, {
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

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(`Errore: ${e.message}`, { status: 500 });
    }
  }
}
