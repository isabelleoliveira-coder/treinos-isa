# Treinos Isa — app offline

App de treino pessoal (protocolo da Déka Lagranha), 100% offline depois de instalado.
Guarda tudo no seu próprio celular — nada passa por servidor nenhum.

## Como publicar (uma vez só)

Você precisa de um lugar público pra hospedar esses arquivos — o GitHub Pages é
grátis e é o mesmo esquema que usamos no "Road to 21K".

1. Crie uma conta em https://github.com (se ainda não tiver).
2. Crie um repositório novo, público, chamado por exemplo `treinos-isa`.
3. Envie TODO o conteúdo desta pasta (`treinos-isa-pwa/`) pra dentro desse
   repositório — os arquivos precisam ficar na raiz do repositório
   (`index.html` direto na raiz, não dentro de uma subpasta).
   - Mais fácil pelo celular/computador: no GitHub, use "Add file" →
     "Upload files" e arraste tudo.
4. No repositório, vá em **Settings → Pages**.
5. Em "Source", escolha a branch `main` e a pasta `/ (root)`. Salve.
6. Espere 1-2 minutos. O GitHub te dá um link tipo:
   `https://SEU-USUARIO.github.io/treinos-isa/`

Esse link é o seu app publicado. Guarde ele.

## Como instalar no iPhone

1. Abra o link acima no **Safari** (importante: Safari, não outro navegador).
2. Toque em Compartilhar (quadrado com seta pra cima) → **"Adicionar à Tela
   de Início"**.
3. Confirme o nome e toque em Adicionar.
4. Pronto — ícone na tela inicial, abre em tela cheia, funciona offline.

## Como instalar no Android

1. Abra o link no **Chrome**.
2. Toque nos 3 pontinhos → **"Adicionar à tela inicial"** (ou vai aparecer
   um banner automático "Instalar app" — pode tocar nele também).
3. Confirme.

## Sobre o offline

Na primeira vez que você abrir o link (com internet), o app baixa e guarda
tudo no celular (HTML, CSS, JS, ícones, sua foto). Depois disso, ele abre e
funciona **mesmo sem internet nenhuma** — registrar série, timer de descanso,
histórico, cargas, trocar tema, tudo funciona offline.

A única coisa que sempre vai precisar de internet é **assistir aos vídeos do
YouTube** dentro do app — isso é uma limitação do próprio YouTube, não tem
como contornar. Sem internet, o botão "Como executar" simplesmente não vai
conseguir carregar o vídeo naquele momento; o resto do app continua normal.

## Onde ficam os dados

Tudo fica salvo no `localStorage` do navegador/app nesse aparelho específico
— não é uma nuvem, não sincroniza sozinho entre celular e computador. Se um
dia você trocar de celular, vai começar com o histórico zerado nesse app
(diferente da versão que roda dentro do Claude, que fica na sua conta).

## Se quiser atualizar algo depois (novo vídeo, ajuste no treino)

Duas opções:
- Editar direto pelo app: os botões "Adicionar vídeo" / "Editar" na aba
  Exercícios continuam funcionando normalmente, e salvam no aparelho.
- Pedir pra eu gerar uma nova versão dos arquivos e você reenviar pro GitHub
  (sobrescrevendo os arquivos antigos) — nesse caso, os treinos/vídeos
  editados por você direto no app não são afetados, porque ficam guardados
  separado dos arquivos do app.
