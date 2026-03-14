
# 🕯️ Maiêutica - O Diálogo Socrático

**Maiêutica** é uma aplicação de filosofia prática que utiliza a Inteligência Artificial (Gemini 2.5 Native Audio) para conduzir diálogos socráticos profundos, ajudando usuários a "darem à luz" ao seu próprio conhecimento.

## 🚀 Tecnologias
- **Frontend**: React 19 + Tailwind CSS
- **IA**: Google Gemini API (Modelos 2.5 Flash Native Audio e Gemini 3 Pro)
- **Persistência**: Supabase (Cloud) + IndexedDB (Local/Offline First)
- **Áudio**: Processamento de áudio PCM em tempo real para voz socrática.

## ✨ Funcionalidades
- **Jornadas Filosóficas**: 5 trilhas curadas com 20 perguntas cada (Virtude, Conhecimento, Estoicismo, etc).
- **Oráculo de Delfos (Live)**: Conversa por voz em tempo real com Sócrates.
- **Modo Eremita (Offline)**: O app funciona totalmente sem internet, sincronizando com o Supabase quando a conexão volta.
- **Painel do Mestre**: Interface para mentores enviarem "sinais" (notificações) aos discípulos.

## 🛠️ Configuração
1. Clone o repositório.
2. Certifique-se de ter uma `API_KEY` do Google AI Studio.
3. Configure seu projeto no **Supabase** com as tabelas: `users`, `journeys`, `questions`, `answers`, `notifications`.

## 🏛️ Filosofia do Projeto
Baseado no método de Sócrates, o app não entrega respostas prontas, mas faz perguntas que desafiam as premissas do interlocutor.
