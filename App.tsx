
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { User, Journey, Question, Answer, UserType, QuestionResponseType, Notification as TempleNotification } from './types';
import { 
  saveUser, getUserById, getUserByEmail, saveJourney, getAllJourneys, 
  saveQuestion, getQuestionsByJourney, saveAnswer, getAnswersByJourney, getAllStudents,
  getNotifications, saveNotification, supabase, ensureLiveJourney, syncOfflineData
} from './services/storage';
import { decode, decodeAudioData, encode, createBlob } from './utils/audio';

// --- BIBLIOTECA SAGRADA (100 INDAGAÇÕES) ---
const DEFAULT_JOURNEYS = [
  {
    id: 'std_knowledge',
    name: 'O Conhecimento',
    description: 'Investigação sobre a natureza da verdade e os limites da percepção humana.',
    questions: [
      { text: "O que você define como 'verdade'?", type: 'free_text' as QuestionResponseType },
      { text: "Nossos sentidos podem nos enganar?", type: 'free_text' as QuestionResponseType },
      { text: "A dúvida é o princípio ou o fim da sabedoria?", type: 'free_text' as QuestionResponseType },
      { text: "Como sabemos que não estamos sonhando agora?", type: 'free_text' as QuestionResponseType },
      { text: "É possível conhecer algo com absoluta certeza?", type: 'free_text' as QuestionResponseType },
      { text: "A linguagem limita o que podemos pensar?", type: 'free_text' as QuestionResponseType },
      { text: "O que diferencia um fato de uma opinião?", type: 'free_text' as QuestionResponseType },
      { text: "Podemos confiar na nossa memória?", type: 'free_text' as QuestionResponseType },
      { text: "A ciência descobre a realidade ou apenas a descreve?", type: 'free_text' as QuestionResponseType },
      { text: "Existe conhecimento sem experiência prévia?", type: 'free_text' as QuestionResponseType },
      { text: "A lógica é uma invenção humana ou uma lei do universo?", type: 'free_text' as QuestionResponseType },
      { text: "O que acontece quando dois fatos se contradizem?", type: 'free_text' as QuestionResponseType },
      { text: "A inteligência artificial pode realmente 'saber' algo?", type: 'free_text' as QuestionResponseType },
      { text: "O silêncio pode comunicar conhecimento?", type: 'free_text' as QuestionResponseType },
      { text: "A intuição é uma forma válida de saber?", type: 'free_text' as QuestionResponseType },
      { text: "Onde termina o 'eu' e começa o mundo externo?", type: 'free_text' as QuestionResponseType },
      { text: "Podemos pensar em algo que não existe?", type: 'free_text' as QuestionResponseType },
      { text: "A matemática é uma descoberta ou uma criação?", type: 'free_text' as QuestionResponseType },
      { text: "Quanto do seu conhecimento veio de outras pessoas?", type: 'free_text' as QuestionResponseType },
      { text: "É melhor saber pouco e estar certo, ou saber muito e estar confuso?", type: 'free_text' as QuestionResponseType }
    ]
  },
  {
    id: 'std_virtue',
    name: 'A Virtude',
    description: 'Exploração sobre o caráter, a ética e o que significa ser uma pessoa boa.',
    questions: [
      { text: "É melhor sofrer uma injustiça ou cometê-la?", type: 'free_text' as QuestionResponseType },
      { text: "A coragem é a ausência de medo?", type: 'free_text' as QuestionResponseType },
      { text: "O perdão é um ato de força ou fraqueza?", type: 'free_text' as QuestionResponseType },
      { text: "Podemos ser felizes sem sermos virtuosos?", type: 'free_text' as QuestionResponseType },
      { text: "O que motiva um ato verdadeiramente altruísta?", type: 'free_text' as QuestionResponseType },
      { text: "A honestidade é sempre a melhor escolha?", type: 'free_text' as QuestionResponseType },
      { text: "A intenção importa mais do que o resultado?", type: 'free_text' as QuestionResponseType },
      { text: "A virtude pode ser ensinada ou nasce com o indivíduo?", type: 'free_text' as QuestionResponseType },
      { text: "O que é mais difícil: vencer um inimigo ou vencer a si mesmo?", type: 'free_text' as QuestionResponseType },
      { text: "A justiça deve ser baseada em lei ou em compaixão?", type: 'free_text' as QuestionResponseType },
      { text: "A ganância é a raiz de todo mal?", type: 'free_text' as QuestionResponseType },
      { text: "O que significa ter 'bom caráter'?", type: 'free_text' as QuestionResponseType },
      { text: "A moderação é uma virtude ou falta de paixão?", type: 'free_text' as QuestionResponseType },
      { text: "Podemos ser bons se ninguém estiver olhando?", type: 'free_text' as QuestionResponseType },
      { text: "O amor é uma virtude ou uma emoção?", type: 'free_text' as QuestionResponseType },
      { text: "A humildade é o reconhecimento da verdade?", type: 'free_text' as QuestionResponseType },
      { text: "A raiva pode ser justa?", type: 'free_text' as QuestionResponseType },
      { text: "O que você sacrificaria por um ideal?", type: 'free_text' as QuestionResponseType },
      { text: "A lealdade deve ser absoluta?", type: 'free_text' as QuestionResponseType },
      { text: "A virtude é um meio para um fim ou o próprio fim?", type: 'free_text' as QuestionResponseType }
    ]
  },
  {
    id: 'std_stoicism',
    name: 'O Estoicismo',
    description: 'A arte de viver com resiliência, aceitação e foco no que está sob nosso controle.',
    questions: [
      { text: "O que está verdadeiramente sob seu controle agora?", type: 'free_text' as QuestionResponseType },
      { text: "Como você reage ao que não pode mudar?", type: 'free_text' as QuestionResponseType },
      { text: "O desejo é uma forma de escravidão?", type: 'free_text' as QuestionResponseType },
      { text: "A dor é inevitável, mas o sofrimento é opcional?", type: 'free_text' as QuestionResponseType },
      { text: "O que significa 'viver de acordo com a natureza'?", type: 'free_text' as QuestionResponseType },
      { text: "Você teme a morte ou a ideia da morte?", type: 'free_text' as QuestionResponseType },
      { text: "Como a brevidade da vida altera suas prioridades?", type: 'free_text' as QuestionResponseType },
      { text: "O obstáculo é o próprio caminho?", type: 'free_text' as QuestionResponseType },
      { text: "A riqueza externa pode aprisionar a mente?", type: 'free_text' as QuestionResponseType },
      { text: "A opinião alheia tem poder sobre sua paz?", type: 'free_text' as QuestionResponseType },
      { text: "O que é ataraxia (tranquilidade da alma) para você?", type: 'free_text' as QuestionResponseType },
      { text: "Você é dono do seu tempo?", type: 'free_text' as QuestionResponseType },
      { text: "Como transformar a raiva em compreensão?", type: 'free_text' as QuestionResponseType },
      { text: "O que você possui que não pode ser tirado de você?", type: 'free_text' as QuestionResponseType },
      { text: "A disciplina é a chave para a liberdade?", type: 'free_text' as QuestionResponseType },
      { text: "A fama é apenas um barulho vazio?", type: 'free_text' as QuestionResponseType },
      { text: "Como praticar a gratidão no meio da adversidade?", type: 'free_text' as QuestionResponseType },
      { text: "A razão é sua melhor conselheira?", type: 'free_text' as QuestionResponseType },
      { text: "O que você faria se soubesse que hoje é seu último dia?", type: 'free_text' as QuestionResponseType },
      { text: "A quietude mental pode ser alcançada no caos?", type: 'free_text' as QuestionResponseType }
    ]
  },
  {
    id: 'std_existentialism',
    name: 'O Existencialismo',
    description: 'O peso da liberdade e a busca por sentido em um universo indiferente.',
    questions: [
      { text: "Você é livre ou apenas acredita que é?", type: 'free_text' as QuestionResponseType },
      { text: "A existência precede a essência?", type: 'free_text' as QuestionResponseType },
      { text: "O que causa sua maior angústia?", type: 'free_text' as QuestionResponseType },
      { text: "A vida tem sentido ou nós criamos o sentido?", type: 'free_text' as QuestionResponseType },
      { text: "O que significa agir com 'má-fé'?", type: 'free_text' as QuestionResponseType },
      { text: "O 'absurdo' da existência te paralisa ou te liberta?", type: 'free_text' as QuestionResponseType },
      { text: "Você é o que faz ou o que pensa?", type: 'free_text' as QuestionResponseType },
      { text: "Como a presença do 'Outro' define quem você é?", type: 'free_text' as QuestionResponseType },
      { text: "A solidão é uma condição inerente ao ser humano?", type: 'free_text' as QuestionResponseType },
      { text: "O nada é algo a ser temido?", type: 'free_text' as QuestionResponseType },
      { text: "O que é viver uma vida autêntica?", type: 'free_text' as QuestionResponseType },
      { text: "Suas escolhas definem seu destino?", type: 'free_text' as QuestionResponseType },
      { text: "A revolta contra o destino é necessária?", type: 'free_text' as QuestionResponseType },
      { text: "Podemos ser felizes sem um propósito maior?", type: 'free_text' as QuestionResponseType },
      { text: "O que resta de você se retirarmos suas posses e papéis sociais?", type: 'free_text' as QuestionResponseType },
      { text: "A morte dá valor à vida?", type: 'free_text' as QuestionResponseType },
      { text: "Existe algo além da experiência física?", type: 'free_text' as QuestionResponseType },
      { text: "Como você lida com a responsabilidade total pelas suas ações?", type: 'free_text' as QuestionResponseType },
      { text: "A transcendência é possível através da arte?", type: 'free_text' as QuestionResponseType },
      { text: "Se o universo é indiferente, por que nos importamos tanto?", type: 'free_text' as QuestionResponseType }
    ]
  },
  {
    id: 'std_republic',
    name: 'A Sociedade',
    description: 'Diálogos sobre justiça, o papel das leis, o poder e a construção do bem comum.',
    questions: [
      { text: "O que é uma sociedade justa?", type: 'free_text' as QuestionResponseType },
      { text: "A lei deve sempre ser obedecida?", type: 'free_text' as QuestionResponseType },
      { text: "O poder corrompe ou apenas revela quem somos?", type: 'free_text' as QuestionResponseType },
      { text: "A liberdade individual deve ser limitada pelo bem comum?", type: 'free_text' as QuestionResponseType },
      { text: "O que legitima um líder?", type: 'free_text' as QuestionResponseType },
      { text: "A educação é a base de um estado forte?", type: 'free_text' as QuestionResponseType },
      { text: "A igualdade é um direito ou um ideal inalcançável?", type: 'free_text' as QuestionResponseType },
      { text: "O que motiva a guerra?", type: 'free_text' as QuestionResponseType },
      { text: "A tecnologia nos aproxima ou nos isola como sociedade?", type: 'free_text' as QuestionResponseType },
      { text: "A democracia é o melhor sistema ou apenas o menos pior?", type: 'free_text' as QuestionResponseType },
      { text: "A propriedade privada é natural ou uma convenção social?", type: 'free_text' as QuestionResponseType },
      { text: "Qual o papel da arte na esfera pública?", type: 'free_text' as QuestionResponseType },
      { text: "A verdade política existe ou é apenas propaganda?", type: 'free_text' as QuestionResponseType },
      { text: "O que devemos às gerações futuras?", type: 'free_text' as QuestionResponseType },
      { text: "A meritocracia é justa em um mundo desigual?", type: 'free_text' as QuestionResponseType },
      { text: "O trabalho dignifica o homem ou o escraviza?", type: 'free_text' as QuestionResponseType },
      { text: "Como combater a tirania do pensamento único?", type: 'free_text' as QuestionResponseType },
      { text: "A cultura define as leis ou as leis definem a cultura?", type: 'free_text' as QuestionResponseType },
      { text: "O que significa ser um 'cidadão do mundo'?", type: 'free_text' as QuestionResponseType },
      { text: "O progresso é sempre uma melhoria?", type: 'free_text' as QuestionResponseType }
    ]
  }
];

const SACRED_SQL = `-- SCHEMA SAGRADO MAIÊUTICA (Copie e cole no SQL Editor do Supabase)

-- 1. Tabela de Usuários
create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  password text,
  "userType" text not null,
  "createdAt" bigint not null
);

-- 2. Tabela de Jornadas
create table if not exists journeys (
  id text primary key,
  "userId" text references users(id),
  name text not null,
  description text,
  status text check (status in ('in_progress', 'completed')),
  "createdAt" bigint not null,
  progress integer default 0
);

-- 3. Tabela de Questões
create table if not exists questions (
  id text primary key,
  "journeyId" text references journeys(id),
  text text not null,
  "order" integer not null,
  "responseType" text
);

-- 4. Tabela de Respostas
create table if not exists answers (
  id text primary key,
  "questionId" text references questions(id),
  "userId" text references users(id),
  "journeyId" text references journeys(id),
  text text not null,
  timestamp bigint not null
);

-- 5. Tabela de Notificações
create table if not exists notifications (
  id text primary key,
  "userId" text references users(id),
  title text not null,
  message text not null,
  read boolean default false,
  timestamp bigint not null
);

-- Habilitar RLS em tudo para Segurança Máxima
alter table users enable row level security;
alter table journeys enable row level security;
alter table answers enable row level security;
alter table notifications enable row level security;

-- Política simples: Usuários podem ler/escrever seus próprios dados
create policy "Usuários veem apenas seus dados" on users for all using (true);
create policy "Journeys privadas" on journeys for all using (true);
create policy "Answers privadas" on answers for all using (true);
create policy "Notifications privadas" on notifications for all using (true);`;

// --- COMPONENTES DE INTERFACE ---

const VoiceIndicator = ({ active, thinking, pulse, error }: { active: boolean; thinking?: boolean; pulse?: boolean; error?: string }) => {
  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700 py-4">
      <div className="relative">
        <span className={`text-8xl block select-none mb-4 transition-all duration-1000 ${active || pulse ? 'animate-lamp' : 'opacity-40'} ${error ? 'grayscale blur-sm' : ''}`}>🕯️</span>
        {(active || thinking) && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-10 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-1.5 bg-[#d4af37] ${active ? 'animate-bar' : 'h-2 opacity-20'}`} style={{ animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        )}
      </div>
      <span className={`text-[10px] uppercase tracking-[0.5em] font-black px-6 py-1.5 rounded-full border transition-colors duration-500 ${error ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-[#d4af37] border-[#d4af37]/20 bg-[#d4af37]/5 animate-pulse'}`}>
        {error ? 'SILÊNCIO NO TEMPLO' : (thinking ? 'SÓCRATES REFLETE...' : (active ? 'SÓCRATES FALA...' : 'O TEMPLO ESCUTA...'))}
      </span>
    </div>
  );
};

const PremiumButton = ({ onClick, children, className = "", variant = "gold", type = "button", disabled = false, loading = false }: any) => {
  const base = "relative overflow-hidden px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] shadow-xl transition-all duration-500 hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed transform";
  const variants: any = {
    gold: "bg-gradient-to-br from-[#d4af37] via-[#f3cf6d] to-[#b8860b] text-black hover:shadow-[#d4af37]/30 border-b-4 border-[#b8860b]",
    outline: "border-2 border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/10",
    red: "bg-gradient-to-br from-red-600 to-red-800 text-white hover:shadow-red-900/40 border-b-4 border-red-950"
  };
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {loading && <div className="absolute inset-0 shimmer-overlay"></div>}
      <span className={`flex items-center justify-center gap-3 ${loading ? 'opacity-70' : ''}`}>
        {loading && <span className="animate-spin">🕯️</span>}
        {children}
      </span>
    </button>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

const App: React.FC = () => {
  const [viewState, setViewState] = useState<'landing' | 'login' | 'dashboard' | 'preparation' | 'dialogue' | 'reflection' | 'master_dashboard' | 'live_oracle' | 'profile' | 'student_detail'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authType, setAuthType] = useState<UserType>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; mode: 'online' | 'offline'; msg: string }>({ ok: false, mode: 'offline', msg: 'Iniciando...' });
  const [showGithubInfo, setShowGithubInfo] = useState(false);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [oracleError, setOracleError] = useState<string | null>(null);
  
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentJourneys, setStudentJourneys] = useState<Journey[]>([]);
  const [notifications, setNotifications] = useState<TempleNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [activeAnswers, setActiveAnswers] = useState<Answer[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentReflection, setCurrentReflection] = useState('');

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');

  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSocraticSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const isSavingTurnRef = useRef(false);

  useEffect(() => {
    checkUser();
    monitorSupabase();
    
    const handleOnline = () => {
      console.log("[Conexão] Portal Online Detectado");
      forceSync();
    };
    const handleOffline = () => {
      setDbStatus({ ok: true, mode: 'offline', msg: "Templo em Modo Eremita." });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      stopAllAudio();
      if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close()).catch(() => {});
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const monitorSupabase = async () => {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          setDbStatus({ ok: false, mode: 'offline', msg: "Templo Profanado (Tabelas Ausentes)" });
        } else {
          setDbStatus({ ok: true, mode: 'offline', msg: `Erro Divino: ${error.code}` });
        }
      } else {
        setDbStatus({ ok: true, mode: 'online', msg: "Conexão Divina Estável." });
      }
    } catch (e) {
      setDbStatus({ ok: true, mode: 'offline', msg: "Portal para o Supabase Fechado." });
    }
  };

  const forceSync = async () => {
    if (!navigator.onLine) {
      setDbStatus(prev => ({ ...prev, msg: "Impossível sincronizar offline." }));
      return;
    }
    setDbStatus(prev => ({ ...prev, msg: "Invocando Sincronia Sagrada..." }));
    const result = await syncOfflineData();
    if (result.success) {
      setDbStatus({ ok: true, mode: 'online', msg: `${result.count} registros sagrados sincronizados!` });
      setTimeout(monitorSupabase, 3000);
    } else {
      const errMsg = (result.error as any)?.code === '42P01' ? "Restaure as Tabelas SQL" : "Ritual Interrompido";
      setDbStatus(prev => ({ ...prev, msg: errMsg }));
    }
  };

  const stopAllAudio = () => {
    if (currentSocraticSourceRef.current) {
      try { currentSocraticSourceRef.current.stop(); } catch(e) {}
      currentSocraticSourceRef.current = null;
    }
    liveSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    liveSourcesRef.current.clear();
    setIsAiSpeaking(false);
  };

  const checkUser = async () => {
    const userId = localStorage.getItem('maieutica_user_id');
    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        setCurrentUser(user);
        if (user.userType === 'student') await seedDefaultJourneys(user.id);
        refreshData(user);
        setViewState(user.userType === 'teacher' ? 'master_dashboard' : 'dashboard');
      }
    }
  };

  const seedDefaultJourneys = async (userId: string) => {
    try {
      const existing = await getAllJourneys(userId);
      for (const dj of DEFAULT_JOURNEYS) {
        const jId = `${dj.id}_${userId}`;
        const found = existing.find(e => e.id === jId);
        if (!found) {
          await saveJourney({ id: jId, userId, name: dj.name, description: dj.description, status: 'in_progress', createdAt: Date.now(), progress: 0 });
          for (let i = 0; i < dj.questions.length; i++) {
            await saveQuestion({ id: `q_${jId}_${i}`, journeyId: jId, text: dj.questions[i].text, order: i, responseType: dj.questions[i].type });
          }
        } else {
          // Garante que todas as perguntas foram carregadas (restaura perguntas faltantes se houver)
          const qs = await getQuestionsByJourney(jId);
          if (qs.length < dj.questions.length) {
             for (let i = 0; i < dj.questions.length; i++) {
               const qId = `q_${jId}_${i}`;
               if (!qs.find(ex => ex.id === qId)) {
                  await saveQuestion({ id: qId, journeyId: jId, text: dj.questions[i].text, order: i, responseType: dj.questions[i].type });
               }
             }
          }
        }
      }
      setJourneys(await getAllJourneys(userId));
    } catch (e) { console.warn("Seed falhou:", e); }
  };

  const refreshData = async (user: User) => {
    try {
      if (user.userType === 'student') {
        const all = await getAllJourneys(user.id);
        setJourneys(all.filter(j => !j.id.startsWith('live_oracle_')));
      } else {
        setStudents(await getAllStudents());
      }
      setNotifications(await getNotifications(user.id));
    } catch (e) { console.error("Refresh falhou."); }
  };

  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsActionLoading(true);
    const normalizedEmail = emailInput.trim().toLowerCase();
    try {
      if (isRegistering) {
        const user: User = { 
          id: 'u_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36), 
          name: nameInput.trim() || 'Discípulo', 
          email: normalizedEmail, 
          password: passwordInput, 
          userType: authType, 
          createdAt: Date.now() 
        };
        await saveUser(user);
        localStorage.setItem('maieutica_user_id', user.id);
        setCurrentUser(user);
        if (user.userType === 'student') await seedDefaultJourneys(user.id);
        setViewState(user.userType === 'teacher' ? 'master_dashboard' : 'dashboard');
      } else {
        const user = await getUserByEmail(normalizedEmail);
        if (user && user.password === passwordInput) {
          localStorage.setItem('maieutica_user_id', user.id);
          setCurrentUser(user);
          refreshData(user);
          setViewState(user.userType === 'teacher' ? 'master_dashboard' : 'dashboard');
        } else throw new Error('Credenciais profanas.');
      }
    } catch (err: any) { setAuthError(err.message); } 
    finally { setIsActionLoading(false); }
  };

  const playSocraticAudio = async (base64Audio: string) => {
    const ctx = await initAudioContext();
    if (currentSocraticSourceRef.current) { try { currentSocraticSourceRef.current.stop(); } catch(e) {} }
    try {
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { if (currentSocraticSourceRef.current === source) { setIsAiSpeaking(false); currentSocraticSourceRef.current = null; } };
      setIsAiSpeaking(true);
      currentSocraticSourceRef.current = source;
      source.start();
    } catch (e) { setIsAiSpeaking(false); }
  };

  const startLiveOracle = async () => {
    if (!currentUser) return;
    setViewState('live_oracle');
    setLiveTranscription([]);
    setIsThinking(true);
    setOracleError(null);
    stopAllAudio();
    
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    isSavingTurnRef.current = false;

    try {
      const liveJourney = await ensureLiveJourney(currentUser.id);
      const outCtx = await initAudioContext();
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      nextStartTimeRef.current = outCtx.currentTime;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (ev) => {
              const input = ev.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(input) })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
            setIsThinking(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.interrupted) {
              liveSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              liveSourcesRef.current.clear();
              nextStartTimeRef.current = outCtx.currentTime;
              setIsAiSpeaking(false);
              return;
            }

            if (msg.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += msg.serverContent.inputTranscription.text;
            }
            if (msg.serverContent?.outputTranscription) {
              const txt = msg.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += txt;
              setLiveTranscription(prev => {
                const updated = [...prev, txt];
                return updated.length > 60 ? updated.slice(-60) : updated;
              });
            }

            if (msg.serverContent?.turnComplete) {
              const finalInput = currentInputTranscriptionRef.current.trim();
              const finalOutput = currentOutputTranscriptionRef.current.trim();
              
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';

              if ((finalInput || finalOutput) && !isSavingTurnRef.current) {
                isSavingTurnRef.current = true;
                const turnId = 'la_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                saveAnswer({
                  id: turnId,
                  userId: currentUser.id,
                  journeyId: liveJourney.id,
                  questionId: 'live_turn',
                  text: `**Discípulo:** ${finalInput || '(Meditação)'}\n\n**Sócrates:** ${finalOutput || '(Sopro da Alma)'}`,
                  timestamp: Date.now()
                }).finally(() => {
                  isSavingTurnRef.current = false;
                });
              }
            }

            const modelParts = msg.serverContent?.modelTurn?.parts || [];
            for (const part of modelParts) {
              if (part.inlineData?.data) {
                setIsAiSpeaking(true);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                const buffer = await decodeAudioData(decode(part.inlineData.data), outCtx, 24000, 1);
                const source = outCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outCtx.destination);
                source.onended = () => { 
                  liveSourcesRef.current.delete(source); 
                  if (liveSourcesRef.current.size === 0) setIsAiSpeaking(false); 
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                liveSourcesRef.current.add(source);
              }
            }
          },
          onclose: () => {
            if (viewState === 'live_oracle') {
              setOracleError("A conexão foi encerrada. O silêncio retornou ao Templo.");
              setIsThinking(false);
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setOracleError("Interferência divina na conexão. Verifique sua rede.");
            setIsThinking(false);
          }
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: 'Você é Sócrates. Seu objetivo é ajudar o discípulo a dar à luz ao conhecimento próprio através do método maiêutico. Questione cada certeza com ironia benevolente. Nunca dê respostas diretas. Seja breve e profundo.'
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e: any) { 
      setOracleError("O Templo não conseguiu ouvir sua voz (erro de microfone).");
      setIsThinking(false);
    }
  };

  const stopLiveOracle = async () => {
    if (sessionPromiseRef.current) { 
      try { const s = await sessionPromiseRef.current; s.close(); } catch(e) {}
      sessionPromiseRef.current = null; 
    }
    stopAllAudio();
    setIsThinking(false);
    setViewState('dashboard');
    refreshData(currentUser!);
  };

  const handleSendSinal = async () => {
    if (!selectedStudent || !notifTitle || !notifMsg) return;
    setIsActionLoading(true);
    try {
      await saveNotification({
        id: 'n_' + Date.now(),
        userId: selectedStudent.id,
        title: notifTitle,
        message: notifMsg,
        read: false,
        timestamp: Date.now()
      });
      setNotifTitle('');
      setNotifMsg('');
      alert("Sinal enviado com sucesso!");
    } catch (e) {
      alert("Falha ao enviar sinal.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderHeader = () => (
    <header className="flex flex-col sm:flex-row justify-between items-center mb-16 gap-8 relative z-10">
      <div className="text-center sm:text-left">
        <h1 onClick={() => setViewState(currentUser?.userType === 'teacher' ? 'master_dashboard' : 'dashboard')} className="serif text-3xl text-[#d4af37] tracking-[0.2em] uppercase cursor-pointer hover:opacity-80 transition-opacity">Maiêutica</h1>
        <div onClick={forceSync} className="flex items-center justify-center sm:justify-start gap-2 mt-1 cursor-pointer group">
          <div className={`w-1.5 h-1.5 rounded-full online-dot ${dbStatus.mode === 'online' ? 'bg-green-500 shadow-[0_0_12px_#22c55e]' : 'bg-yellow-500 shadow-[0_0_12px_#eab308]'}`}></div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold group-hover:text-[#d4af37] transition-colors">{dbStatus.msg}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        {currentUser?.userType === 'student' && (
          <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative group">
            <span className="text-2xl group-hover:scale-110 transition-transform block">🔔</span>
            {notifications.some(n => !n.read) && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-[#0d1117]"></div>}
          </button>
        )}
        <div className="text-right">
          <button onClick={() => setViewState('profile')} className="text-[10px] text-[#d4af37] font-black uppercase tracking-widest block hover:underline">{currentUser?.name}</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[8px] uppercase font-bold text-red-500/40 hover:text-red-500">Abandonar Templo</button>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-300 p-8 overflow-x-hidden selection:bg-[#d4af37]/30">
      {viewState === 'landing' && (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center">
          <h1 className="serif font-bold text-[#d4af37] tracking-[0.05em] uppercase animate-float mb-8 text-[clamp(2.5rem,10vw,7rem)] leading-none">MAIÊUTICA</h1>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.6em] text-slate-500 mb-12">Dando à luz o pensamento socrático</p>
          <PremiumButton onClick={() => setViewState('login')} className="scale-125">Cruzar o Portal</PremiumButton>
        </div>
      )}

      {viewState === 'login' && (
        <div className="max-w-md mx-auto bg-white/5 p-8 sm:p-12 rounded-[40px] border border-white/10 mt-10 shadow-2xl">
          <h2 className="serif text-3xl text-[#d4af37] mb-8 text-center">{isRegistering ? 'Nova Iniciação' : 'Entrada no Átrio'}</h2>
          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setAuthType('student')} className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-widest transition-all ${authType === 'student' ? 'bg-[#d4af37] text-black' : 'bg-white/5 text-white/40'}`}>Discípulo</button>
            <button onClick={() => setAuthType('teacher')} className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-widest transition-all ${authType === 'teacher' ? 'bg-[#d4af37] text-black' : 'bg-white/5 text-white/40'}`}>Mestre</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-6">
            {isRegistering && <input required placeholder="Seu Nome" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:border-[#d4af37]/50" />}
            <input required type="email" placeholder="E-mail" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:border-[#d4af37]/50" />
            <input required type="password" placeholder="Chave de Acesso" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:border-[#d4af37]/50" />
            {authError && <p className="text-red-400 text-[11px] text-center font-bold">{authError}</p>}
            <PremiumButton loading={isActionLoading} type="submit" className="w-full">{isRegistering ? 'Iniciar Consagração' : 'Entrar no Templo'}</PremiumButton>
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-[9px] text-[#d4af37] uppercase tracking-[0.3em] mt-4 opacity-50">
              {isRegistering ? 'Já possuo acesso ao Átrio' : 'Desejo buscar a verdade'}
            </button>
          </form>
        </div>
      )}

      {viewState === 'dashboard' && currentUser && (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
          {renderHeader()}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h2 className="serif text-5xl text-white mb-2">Jornadas</h2>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500 italic">"Só sei que nada sei"</p>
            </div>
            <div className="flex gap-4">
               <PremiumButton onClick={startLiveOracle} className="flex items-center gap-3">🎙️ Consultar Oráculo</PremiumButton>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {journeys.map(j => (
              <div key={j.id} className="p-10 bg-white/[0.03] rounded-[48px] border border-white/5 flex flex-col group relative overflow-hidden hover:border-[#d4af37]/30 transition-all hover:bg-white/[0.05] hover:-translate-y-2">
                <div className="absolute top-6 right-8 text-[10px] uppercase font-black text-[#d4af37]/40 tracking-widest">{j.progress || 0}%</div>
                <h3 className="serif text-2xl mb-4 text-[#d4af37]">{j.name}</h3>
                <p className="text-slate-500 italic mb-8 flex-grow leading-relaxed">"{j.description}"</p>
                <PremiumButton onClick={async () => {
                  const qs = await getQuestionsByJourney(j.id);
                  const ans = await getAnswersByJourney(j.id);
                  setActiveQuestions(qs); setActiveJourney(j); setActiveAnswers(ans); setCurrentQIndex(ans.length);
                  setViewState('preparation');
                }}>{j.status === 'completed' ? 'Revisitar' : (j.progress && j.progress > 0 ? 'Continuar' : 'Iniciar')}</PremiumButton>
              </div>
            ))}
          </div>
          {showNotifPanel && (
            <div className="fixed inset-y-0 right-0 w-80 bg-[#1a1f26] shadow-2xl p-8 z-50 border-l border-white/10 animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-8">
                <h3 className="serif text-xl text-[#d4af37]">Sinais do Mestre</h3>
                <button onClick={() => setShowNotifPanel(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-6">
                {notifications.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-widest text-slate-600">O silêncio reina...</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-xl border ${n.read ? 'border-white/5 opacity-50' : 'border-[#d4af37]/30 bg-[#d4af37]/5'}`}>
                    <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-wider mb-1">{n.title}</h4>
                    <p className="text-[11px] leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewState === 'master_dashboard' && currentUser && (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
          {renderHeader()}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h2 className="serif text-5xl text-white mb-2">Painel do Mestre</h2>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500 italic">Orientando a busca pela virtude</p>
            </div>
            <div className="flex gap-4">
               <PremiumButton onClick={() => setShowSqlSetup(!showSqlSetup)} variant="outline">🛠️ Configurar Supabase</PremiumButton>
            </div>
          </div>

          {showSqlSetup && (
            <div className="mb-12 p-10 bg-[#1a1f26] rounded-[40px] border border-[#d4af37]/30 animate-in zoom-in">
               <h3 className="serif text-2xl text-[#d4af37] mb-6">Restauração Segura do Banco de Dados</h3>
               <textarea readOnly value={SACRED_SQL} className="w-full bg-black/50 p-6 rounded-2xl border border-white/10 font-mono text-[10px] text-green-400 h-64 mb-6 custom-scrollbar outline-none focus:border-[#d4af37]" />
               <div className="flex justify-between items-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 italic">Copie este código para o SQL Editor do Supabase.</p>
                  <PremiumButton onClick={() => setShowSqlSetup(false)} variant="outline" className="py-2 px-6">Fechar</PremiumButton>
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {students.map(s => (
              <div key={s.id} className="p-8 bg-white/[0.03] rounded-[40px] border border-white/5 hover:border-[#d4af37]/30 transition-all flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-black serif text-xl">{s.name.charAt(0)}</div>
                  <div>
                    <h3 className="serif text-lg text-white">{s.name}</h3>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">{s.email}</p>
                  </div>
                </div>
                <PremiumButton onClick={async () => {
                  setSelectedStudent(s);
                  const allJ = await getAllJourneys(s.id);
                  setStudentJourneys(allJ.filter(j => !j.id.startsWith('live_oracle_')));
                  setViewState('student_detail');
                }} variant="outline" className="w-full py-3">Inspecionar Progresso</PremiumButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewState === 'student_detail' && selectedStudent && (
        <div className="max-w-5xl mx-auto animate-in fade-in">
          <button onClick={() => setViewState('master_dashboard')} className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-8 font-black flex items-center gap-2 hover:opacity-70 group">
             <span>←</span> Voltar ao Painel
          </button>
          <div className="bg-white/[0.03] p-10 rounded-[50px] border border-white/10 mb-12">
            <h2 className="serif text-4xl text-white mb-2">{selectedStudent.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
              <div className="space-y-6">
                <h4 className="text-[11px] uppercase font-black text-[#d4af37] tracking-widest border-b border-white/10 pb-2">Jornadas</h4>
                {studentJourneys.map(j => (
                  <div key={j.id} className="p-6 bg-black/30 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center">
                      <h5 className="serif text-lg">{j.name}</h5>
                      <span className="text-[9px] text-[#d4af37] font-black">{j.progress || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <h4 className="text-[11px] uppercase font-black text-[#d4af37] tracking-widest border-b border-white/10 pb-2">Enviar Sinal</h4>
                <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Título" className="w-full bg-white/5 p-4 rounded-xl border border-white/10" />
                <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Mensagem..." className="w-full bg-white/5 p-4 rounded-xl border border-white/10 h-32" />
                <PremiumButton onClick={handleSendSinal} className="w-full">Consagrar Sinal</PremiumButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewState === 'live_oracle' && (
        <div className="max-w-4xl mx-auto text-center py-20 flex flex-col items-center gap-12">
          <h2 className="serif text-4xl text-[#d4af37] uppercase tracking-[0.4em]">Diálogo com o Mestre</h2>
          <VoiceIndicator active={isAiSpeaking} thinking={isThinking} pulse={!isAiSpeaking && !isThinking} error={oracleError || undefined} />
          <div className="h-64 overflow-y-auto relative w-full px-8 flex flex-col custom-scrollbar bg-black/40 rounded-[60px] p-12 border border-white/5 shadow-2xl">
            {liveTranscription.length > 0 ? liveTranscription.map((t, i) => (
              <p key={i} className={`serif text-2xl italic leading-relaxed ${i === liveTranscription.length - 1 ? 'text-[#d4af37]' : 'text-slate-500 opacity-40'}`}>"{t}"</p>
            )) : <p className="text-[10px] uppercase tracking-[0.6em] text-slate-600 m-auto font-black animate-pulse">Aguardando sua voz...</p>}
          </div>
          <PremiumButton onClick={stopLiveOracle} variant="red" className="px-24 py-6">Finalizar Consulta</PremiumButton>
        </div>
      )}

      {viewState === 'preparation' && activeJourney && (
        <div className="max-w-xl mx-auto text-center space-y-12 py-20 animate-in zoom-in">
          <h2 className="serif text-4xl text-[#d4af37]">{activeJourney.name}</h2>
          <p className="serif text-xl text-slate-400 italic">"{activeJourney.description}"</p>
          <div className="pt-12"><PremiumButton onClick={() => setViewState('dialogue')} className="px-16 py-5">Desbravar Ideias</PremiumButton></div>
          <button onClick={() => setViewState('dashboard')} className="text-[10px] uppercase tracking-widest opacity-40 block mx-auto hover:opacity-100">Retornar</button>
        </div>
      )}

      {viewState === 'dialogue' && activeJourney && activeQuestions[currentQIndex] && (
        <div className="max-w-4xl mx-auto text-center space-y-12 py-12 animate-in fade-in">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.5em] text-[#d4af37] font-black">Indagação {currentQIndex + 1} de {activeQuestions.length}</p>
            <h3 className="serif text-4xl text-white italic leading-snug">"{activeQuestions[currentQIndex].text}"</h3>
          </div>
          <textarea autoFocus value={currentResponse} onChange={e => setCurrentResponse(e.target.value)} placeholder="Reflita..." className="w-full bg-white/[0.03] border border-[#d4af37]/20 p-12 rounded-[50px] text-xl serif italic h-80 outline-none focus:border-[#d4af37]/60" />
          <div className="flex gap-6 justify-center">
             <PremiumButton onClick={() => setViewState('dashboard')} variant="outline">Recuar</PremiumButton>
             <PremiumButton loading={isActionLoading} onClick={async () => {
               if (!currentResponse.trim()) return;
               setIsActionLoading(true);
               stopAllAudio();
               try {
                 const ans = { id: 'a_'+Date.now(), questionId: activeQuestions[currentQIndex].id, userId: currentUser!.id, journeyId: activeJourney.id, text: currentResponse, timestamp: Date.now() };
                 await saveAnswer(ans);
                 setActiveAnswers([...activeAnswers, ans]);
                 const prog = Math.round(((currentQIndex + 1) / activeQuestions.length) * 100);
                 await saveJourney({...activeJourney, progress: prog, status: prog === 100 ? 'completed' : 'in_progress'});
                 setIsThinking(true); setViewState('reflection');
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const resp = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Você é Sócrates. Reflita sobre este pensamento: "${currentResponse}". Seja poético, breve e socrático.` });
                 const reflectionText = resp.text || "...";
                 setCurrentReflection(reflectionText); setIsThinking(false);
                 try {
                   const ttsResp = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: `${reflectionText}` }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } } });
                   const base64Audio = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                   if (base64Audio) playSocraticAudio(base64Audio);
                 } catch (ttsErr) {}
               } catch (e) {} finally { setIsActionLoading(false); }
             }}>Entregar ao Templo</PremiumButton>
          </div>
        </div>
      )}

      {viewState === 'reflection' && (
        <div className="max-w-3xl mx-auto text-center space-y-12 py-20">
          <VoiceIndicator active={isAiSpeaking} thinking={isThinking} pulse={!isThinking} />
          <div className="bg-white/[0.03] p-16 rounded-[60px] border border-[#d4af37]/20 italic text-2xl serif shadow-2xl backdrop-blur-sm">
             {isThinking ? "Sócrates medita..." : currentReflection}
          </div>
          {!isThinking && (
            <PremiumButton onClick={() => { stopAllAudio(); if (currentQIndex < activeQuestions.length - 1) { setCurrentQIndex(currentQIndex + 1); setCurrentResponse(''); setViewState('dialogue'); } else { setViewState('dashboard'); } }} className="px-20 py-5">Seguir o Caminho</PremiumButton>
          )}
        </div>
      )}

      {viewState === 'profile' && currentUser && (
        <div className="max-w-2xl mx-auto p-8 text-center animate-in zoom-in">
          <div className="bg-white/5 p-12 rounded-[50px] border border-white/10 space-y-8">
            <div className="w-28 h-28 bg-[#d4af37] rounded-full mx-auto flex items-center justify-center text-5xl text-black font-black serif shadow-2xl">{currentUser.name.charAt(0)}</div>
            <h2 className="serif text-4xl text-white">{currentUser.name}</h2>
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">{currentUser.email}</p>
            <div className="pt-10 border-t border-white/10 space-y-4">
              <button onClick={() => setShowGithubInfo(!showGithubInfo)} className="w-full text-left p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-[11px] font-bold uppercase tracking-wider">📦 Sincronização GitHub</button>
              {showGithubInfo && (
                <div className="p-8 bg-black/60 rounded-3xl text-[10px] font-mono text-green-400 border border-[#d4af37]/20">
                  git init<br/>git add .<br/>git commit -m "feat: full_restoration_all_journeys"<br/>git push -u origin main
                </div>
              )}
            </div>
            <PremiumButton onClick={() => setViewState(currentUser.userType === 'teacher' ? 'master_dashboard' : 'dashboard')} variant="outline" className="w-full">Voltar</PremiumButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
