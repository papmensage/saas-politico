import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 CONFIG FIREBASE
const getFirebaseUrl = (empresa) =>
  `https://firestore.googleapis.com/v1/projects/papmensage-27a3e/databases/(default)/documents/empresas/${empresa}/clientes`;

// 🔥 CONFIG Z-API
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;

// 🔥 VALIDAÇÃO
if (!ZAPI_INSTANCE || !ZAPI_TOKEN || !CLIENT_TOKEN) {
  console.error("❌ Variáveis de ambiente não configuradas");
}

// 🔥 DELAY
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔥 ENVIO WHATSAPP
async function enviarMensagem(telefone, texto) {
  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": CLIENT_TOKEN
        },
        body: JSON.stringify({
          phone: telefone,
          message: texto
        })
      }
    );

    const result = await response.text();

    console.log("📤 Enviando para:", telefone);
    console.log("📤 Mensagem:", texto);
    console.log("📤 Resposta Z-API:", result);

  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
}

// 🔥 WEBHOOK
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // responde rápido

  try {
    console.log("Recebido:", JSON.stringify(req.body, null, 2));

    const data = req.body;

    if (!data.phone) {
  console.log("❌ Telefone não recebido");
  return;
}

const telefone = data.phone;
    const mensagem = (
      data.text?.message ||
      data.text ||
      data.message ||
      data.body ||
      ""
    ).toLowerCase().trim();

    let empresa = "padrao";
    let nome = "desconhecido";

    if (mensagem.includes("quero_cupom_")) {
      const partes = mensagem.split("quero_cupom_")[1].split("_");
      empresa = partes[0] || "padrao";

      if (partes.length > 1) {
        nome = partes.slice(1).join(" ");
      }
    }

    // 🔥 SALVA NO FIREBASE
    await fetch(getFirebaseUrl(empresa), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          telefone: { stringValue: telefone },
          empresa: { stringValue: empresa },
          nome: { stringValue: nome },
          origem: { stringValue: "whatsapp" },
          campanha: { stringValue: "QR_FEIRA" },
          data: { timestampValue: new Date().toISOString() }
        }
      })
    });

    console.log("🔥 SALVO NO FIREBASE");

    // 🚀 FLUXO
    if (mensagem.includes("quero_cupom")) {

      await enviarMensagem(telefone, `🎉 Bem-vindo(a) 👋

Você ganhou um desconto exclusivo da ExpoPrint!`);

      await delay(1500);

      await enviarMensagem(telefone, `🎁 Seu cupom:

CUPOM EXPOPRINT10`);

      await delay(1500);

      await enviarMensagem(telefone, `📍 Digite:
1️⃣ Promoções
2️⃣ Catálogo
3️⃣ Atendimento`);
    }

    // 🤖 MENU
    if (mensagem === "1") {
      await enviarMensagem(telefone, `🔥 Promoções disponíveis`);
    }

    if (mensagem === "2") {
      await enviarMensagem(telefone, `📘 Catálogo:
https://seudominio.com/catalogo`);
    }

    if (mensagem === "3") {
      await enviarMensagem(telefone, `👨‍💼 Atendimento em instantes`);
    }

  } catch (err) {
    console.error("Erro:", err);
  }
});

// 🔥 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Rodando na porta", PORT);
});

// 🔥 TESTE
app.get("/teste", async (req, res) => {

  const telefone = req.query.tel;

  if (!telefone) {
    return res.status(400).send("Informe o telefone ?tel=");
  }

  await enviarMensagem(telefone, "TESTE DIRETO 🚀");

  res.send(`Mensagem enviada para ${telefone}`);
});