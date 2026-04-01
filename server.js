import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * ==============================
 * 🔧 CONFIGURAÇÕES
 * ==============================
 */

// 🔥 Firebase (PROJETO POLÍTICO)
const FIREBASE_PROJECT = "saas-politico-6ed76";

// 🔥 Z-API
const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;

// 🔥 Validação de ambiente
if (!ZAPI_INSTANCE || !ZAPI_TOKEN || !CLIENT_TOKEN) {
  console.error("❌ Variáveis de ambiente não configuradas");
}

/**
 * ==============================
 * 🔗 FIREBASE
 * ==============================
 */

const getFirebaseUrl = (campanha) =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/campanhas/${campanha}/eleitores`;

/**
 * ==============================
 * ⏱️ UTIL
 * ==============================
 */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ==============================
 * 📤 ENVIO WHATSAPP
 * ==============================
 */

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

    console.log("📤 Enviado para:", telefone);
    console.log("📤 Msg:", texto);
    console.log("📤 Z-API:", result);

  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err);
  }
}

/**
 * ==============================
 * 💾 SALVAR ELEITOR
 * ==============================
 */

async function salvarEleitor({ telefone, campanha, nome, bairro }) {
  try {
    await fetch(getFirebaseUrl(campanha), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          telefone: { stringValue: telefone },
          campanha: { stringValue: campanha },
          nome: { stringValue: nome },
          bairro: { stringValue: bairro },
          origem: { stringValue: "whatsapp" },
          data: { timestampValue: new Date().toISOString() }
        }
      })
    });

    console.log("✅ Eleitor salvo:", telefone);

  } catch (err) {
    console.error("❌ Erro ao salvar eleitor:", err);
  }
}

/**
 * ==============================
 * 🧠 PROCESSAR MENSAGEM
 * ==============================
 */

function extrairDados(mensagem) {
  let campanha = "padrao";
  let nome = "desconhecido";
  let bairro = "nao informado";

  if (mensagem.includes("quero_participar_")) {
    const partes = mensagem.split("quero_participar_")[1].split("_");

    campanha = partes[0] || "padrao";
    nome = partes[1] || "desconhecido";
    bairro = partes[2] || "nao informado";
  }

  return { campanha, nome, bairro };
}

/**
 * ==============================
 * 🤖 FLUXO POLÍTICO
 * ==============================
 */

async function fluxoInicial(telefone) {
  await enviarMensagem(telefone, `👋 Olá!

Você entrou no canal oficial do candidato.

Digite:

1️⃣ Propostas
2️⃣ Eventos
3️⃣ Falar com a equipe`);
}

async function fluxoMenu(telefone, mensagem) {

  if (mensagem === "1") {
    await enviarMensagem(telefone, `📋 Nossas propostas:

✔️ Saúde
✔️ Segurança
✔️ Educação`);
  }

  if (mensagem === "2") {
    await enviarMensagem(telefone, `📅 Próximos eventos:

📍 Sábado - Reunião
📍 Domingo - Caminhada`);
  }

  if (mensagem === "3") {
    await enviarMensagem(telefone, `👨‍💼 Nossa equipe entrará em contato com você!`);
  }
}

/**
 * ==============================
 * 🔥 WEBHOOK
 * ==============================
 */

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const data = req.body;

    const telefone = data.telefone || data.phone || data.from;

    if (!data.phone) {
      console.log("❌ Telefone não encontrado");
      return;
    }

if (!telefone) {
  console.log("❌ Telefone não encontrado");
  return;
}
    const mensagem = (
  data.texto?.mensagem ||
  data.text?.message ||
  data.text ||
  data.message ||
  data.body ||
  ""
).toLowerCase().trim();

    console.log("📞 Telefone:", telefone);
    console.log("💬 Mensagem:", mensagem);

    const { campanha, nome, bairro } = extrairDados(mensagem);

    // 💾 Salvar
    await salvarEleitor({
      telefone,
      campanha,
      nome,
      bairro
    });

    // 🚀 Fluxo inicial
    if (mensagem.includes("quero_participar")) {
      await fluxoInicial(telefone);
      return;
    }

    // 🤖 Menu
    await fluxoMenu(telefone, mensagem);

  } catch (err) {
    console.error("❌ Erro geral:", err);
  }
});

/**
 * ==============================
 * 🧪 TESTE
 * ==============================
 */

app.get("/teste", async (req, res) => {
  const telefone = req.query.tel;

  if (!telefone) {
    return res.status(400).send("Informe ?tel=");
  }

  await enviarMensagem(telefone, "🚀 Teste político funcionando!");

  res.send("OK");
});

/**
 * ==============================
 * 🚀 START
 * ==============================
 */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});