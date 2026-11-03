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
      const tipo = formData.get('tipo') || 'logo'; // logo o banner
      if (!nome) return new Response("Manca nome", { status: 400 });

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
      
      // Decide nome file: logo.webp o banner.webp
      const fileName = tipo === 'banner' ? 'banner.webp' : 'logo.webp';

      const githubRes = await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/zetacraft-hub-upload/contents/${nome}/${fileName}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "ZetaCraft-Worker"
        },
        body: JSON.stringify({
          message: `Upload ${fileName} per ${nome}`,
          content: base64
        })
      });

      if (!githubRes.ok) {
        return new Response(`Errore GitHub: ${await githubRes.text()}`, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }

      return new Response(JSON.stringify({ ok: true, path: `${nome}/${fileName}` }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(`Errore: ${e.message}`, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  }
}
