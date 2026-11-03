export default {
  async fetch(request, env) {
    const formData = await request.formData();
    const file = formData.get('file');
    const nome = formData.get('nome');

    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Carica su GitHub
    await fetch(`https://api.github.com/repos/TUOUSER/ZetaCraft-Hub/contents/public/logo/profiles/${nome}/logo.webp`, {
      method: "PUT",
      headers: { 
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Nuovo logo ${nome}`,
        content: base64
      })
    });

    return new Response("Caricato!");
  }
}
