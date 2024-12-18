/**
 * Viene Eseguita per ogni richiesta
 * Questa funzione fa da "firewall" per limitare le rotte che possono esere chiamate dall'esterno
 */
function LimitaRotte(next) {
  return (c) => {

    // Esempio: 123.123.123:12345. Richieste da IP interni cominciano con 172.20
    const forwarded_for = c.request().header.get("X-Forwarded-For");

    if (!forwarded_for.startsWith("172.20.")) {
      // provviene dall'esterno
      // Contiene il path della richiesta. Esempio: /links, /assets/style.css, etc.
      const original_url = c.request().header.get("X-Original-Url");
      if (original_url.startsWith("/api")) {
        // blocca /api* TRANNE /api/collections e /api/files
        if (!original_url.startsWith("/api/collections/") && !original_url.startsWith("/api/files/")) {
          throw new BadRequestError("Invalid request")
        }
      }
      if (original_url.startsWith("/_")) {
        // blocca pagina admin
        throw new BadRequestError("Invalid request")
      }
    }

    return next(c) // proceed with the request chain
  }
}

// Questo fa si che il middleware sopra definito venga preso in considerazione.
// Nel caso non si volesse utilizzarlo, basta commentare la riga sottostante:
routerUse(LimitaRotte)


/**
 * Viene chiamato dopo la _creazione_ di un nuovo link.
 * Appena creato un nuovo link, genera un QR code per il link al documento e lo allega al campo corretto del link
 */
onRecordAfterCreateRequest((e) => {
  try {
    const record = $app.dao().findRecordById("links", e.record.id);
    const form = new RecordUpsertForm($app, record);
    const qrdata = encodeURIComponent("https://cambia_il_dominio/links?id=" + e.record.id);

    const res = $http.send({
      url: "https://quickchart.io/qr?margin=1&size=256&text=" + qrdata,
      method: "get",
    });

    if (res.statusCode != 200) {
      throw new Error("Status code not 200");
    }

    if (res.headers['Content-Type'][0] != 'image/png') {
      throw new Error("File is not an image");
    }

    const file1 = $filesystem.fileFromBytes(res.raw, "qr_" + e.record.id + ".png");
    //console.log(JSON.stringify(res, null, 4));
    form.addFiles("qr", file1)
    form.submit()
    //console.log("QR code created and attached");

  } catch (e) {
    console.log(e);
  }
}, "links");