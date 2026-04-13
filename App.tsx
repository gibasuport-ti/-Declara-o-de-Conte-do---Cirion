import React, { useState, useRef, useEffect } from 'react';
import { Mail, Plus, Scissors, Loader2, Moon, Sun, Trash2, Printer } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toPng } from 'html-to-image';
import { DeclarationForm, Item, Entity } from './types';
import { saveDraft, getDraft } from './db';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const formatBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CIRION_UNITS = [
  { label: 'SP - Cotia (Sede)', cnpj: '72.843.212/0006-56', uf: 'SP', cidade: 'Cotia', bairro: 'Pq. Sao George', endereco: 'Rua Eid Mansur 666 Andar 1', cep: '06708-070' },
  { label: 'RJ - Rio de Janeiro', cnpj: '72.843.212/0002-22', uf: 'RJ', cidade: 'Rio de Janeiro', bairro: 'São Cristóvão', endereco: 'Av. Pedro II, 329', cep: '20941-070' },
  { label: 'SP - Vila Olímpia', cnpj: '72.843.212/0021-95', uf: 'SP', cidade: 'São Paulo', bairro: 'Vila Olimpia', endereco: 'Alameda Vicente Pinzon 51 Andar 4', cep: '04547-130' },
  { label: 'DF - Brasília', cnpj: '72.843.212/0008-18', uf: 'DF', cidade: 'Brasília', bairro: 'Asa Norte', endereco: 'ST SBN Quadra 1 Bloco B Salas 303 e 304 Edif. Confe', cep: '70040-010' },
  { label: 'PR - Curitiba', cnpj: '72.843.212/0005-75', uf: 'PR', cidade: 'Curitiba', bairro: 'Cidade Industrial', endereco: 'R. do Semeador 354', cep: '81260-190' },
];

const INITIAL_SENDER: Entity = {
  nome: 'Cirion Technologies',
  cnpj_cpf: '72.843.212/0006-56',
  endereco: 'Rua Eid Mansur 666 Andar 1 - Pq. Sao George',
  cidade: 'Cotia',
  uf: 'SP',
  cep: '06708-070'
};

const INITIAL_RECEIVER: Entity = {
  nome: 'Cirion Technologies',
  contato: '',
  cnpj_cpf: '72.843.212/0002-22',
  endereco: 'Av. Pedro II, 329 - São Cristóvão',
  cidade: 'Rio de Janeiro',
  uf: 'RJ',
  cep: '20941-070'
};

const App: React.FC = () => {
  const [form, setForm] = useState<DeclarationForm>({
    remetente: { ...INITIAL_SENDER },
    destinatario: { ...INITIAL_RECEIVER },
    itens: [{ id: generateId(), conteudo: 'Equipamento de TI', quantidade: 1, valor: 0 }],
    pesoTotal: '',
    cidadeDeclaracao: 'São Paulo', 
    dataDeclaracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    assinatura: null,
  });

  const sigPad = useRef<SignatureCanvas>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados do IndexedDB ao iniciar
  useEffect(() => {
    const loadData = async () => {
      const savedData = await getDraft();
      if (savedData) {
        setForm(savedData);
        if (savedData.assinatura) {
          setIsSigned(true);
        }
      }
    };
    loadData();
  }, []);

  // Salvar dados no IndexedDB sempre que o form mudar (Debounce de 1s)
  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(async () => {
      await saveDraft(form);
      setIsSaving(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [form]);

  // Definições de Estilo Dinâmico
  const borderColor = isDarkMode ? 'border-gray-600' : 'border-black';
  const bgHeader = isDarkMode ? 'bg-gray-800' : 'bg-gray-100';
  const textColor = isDarkMode ? 'text-gray-200' : 'text-black';
  const inputBg = 'bg-transparent';
  
  const selectUnit = (type: 'remetente' | 'destinatario', cnpj: string) => {
    const unit = CIRION_UNITS.find(u => u.cnpj === cnpj);
    if (unit) {
      setForm(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          cnpj_cpf: unit.cnpj,
          endereco: `${unit.endereco} - ${unit.bairro}`,
          cidade: unit.cidade,
          uf: unit.uf,
          cep: unit.cep
        }
      }));
    }
  };

  const updateEntity = (type: 'remetente' | 'destinatario', field: keyof Entity, value: string) => {
    setForm(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const removeItem = (id: string) => {
    if (form.itens.length <= 1) return; // Impede deletar o último item
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter(i => i.id !== id)
    }));
  };

  const handlePrint = async () => {
    setIsCapturing(true);
    
    // Pequeno timeout para garantir que o loader apareça
    setTimeout(async () => {
      try {
        if (!formRef.current) return;

        const element = formRef.current;
        
        // CORREÇÃO: Força dimensões explícitas baseadas no scrollHeight para evitar cortes
        const width = 794; // Largura A4 padrão
        const height = element.scrollHeight; // Altura real do conteúdo

        // Captura com alta qualidade para impressão (pixelRatio 2)
        const dataUrl = await toPng(element, { 
          quality: 1.0, 
          pixelRatio: 2, 
          width: width,
          height: height,
          backgroundColor: '#ffffff',
          filter: (node) => {
            if (!(node instanceof HTMLElement)) return true;
            // Remove botões e selects da impressão
            if (node.tagName === 'BUTTON' || node.tagName === 'SELECT') return false;
            // Remove elementos marcados como no-print (exceto inputs que precisam aparecer)
            if (node.classList.contains('no-print')) {
               if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') return true;
               return false;
            }
            return true;
          },
          style: {
            // Garante que o elemento seja renderizado completo na captura
            width: `${width}px`,
            height: `${height}px`,
            overflow: 'visible',
            maxHeight: 'none',
            transform: 'none',
            margin: '0',
            // Reseta bordas para preto para garantir contraste na impressão
            borderColor: 'black' 
          }
        });

        // Abre uma nova janela/aba
        const printWindow = window.open('', '_blank');
        
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Imprimir Declaração</title>
                        <style>
                            body { 
                                margin: 0; 
                                display: flex; 
                                justify-content: center; 
                                background-color: #525659; 
                                height: 100vh;
                                font-family: sans-serif;
                            }
                            .page-container {
                                margin: 20px;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                                background: white;
                                width: fit-content;
                            }
                            img { 
                                max-width: 100%; 
                                height: auto; 
                                display: block;
                            }
                            @media print {
                                body { 
                                    background-color: white; 
                                    height: auto;
                                    display: block;
                                }
                                .page-container {
                                    margin: 0;
                                    box-shadow: none;
                                    width: 100%;
                                }
                                img { 
                                    width: 100%; 
                                    max-width: none; 
                                    margin: 0;
                                }
                                @page { 
                                    margin: 0; 
                                    size: auto; 
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="page-container">
                            <img src="${dataUrl}" onload="setTimeout(() => window.print(), 500);" />
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            alert('Por favor, permita popups para imprimir.');
        }

      } catch (e) {
        console.error(e);
        alert("Erro ao gerar a impressão.");
      } finally { 
        setIsCapturing(false); 
      }
    }, 100);
  };

  const sendEmail = async () => {
    if (!isSigned) return alert("Por favor, assine a declaração antes de enviar.");
    
    setIsCapturing(true);
    
    setTimeout(async () => {
      try {
        if (!formRef.current) throw new Error("Referência do formulário não encontrada");

        const element = formRef.current;
        const width = 794; 
        const height = element.scrollHeight;

        const dataUrl = await toPng(element, { 
          width: width, 
          height: height, 
          backgroundColor: '#ffffff', 
          pixelRatio: 1, 
          filter: (node) => {
            if (!(node instanceof HTMLElement)) return true;
            if (node.tagName === 'BUTTON' || node.tagName === 'SELECT') {
              return false;
            }
            if (node.classList.contains('no-print') || node.classList.contains('hide-on-outlook-send')) {
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                return true;
              }
              return false;
            }
            return true;
          },
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: 'none',
            overflow: 'visible',
            maxHeight: 'none',
            maxWidth: 'none',
            margin: '0',
            color: 'black',
            borderColor: 'black'
          }
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        
        const subject = `Solicitação de Correio - ${form.destinatario.nome}`;
        const mailtoLink = `mailto:larissa.pereira.ext@ciriontechnologies.com; antonio.castro@ciriontechnologies.com?cc=IT.EUS.Brasil.Tier2@ciriontechnologies.com&subject=${encodeURIComponent(subject)}&body=Olá,%0D%0A%0D%0ASolicito o envio da correspondência em anexo.%0D%0ACentro de Custo : J639I013%0D%0A%0D%0A[COLE A IMAGEM ABAIXO (Ctrl+V)]:%0D%0A`;
        
        window.location.href = mailtoLink;
        
        alert("IMAGEM COPIADA COM SUCESSO!\n\n1. O Outlook deve abrir automaticamente.\n2. No corpo do email, pressione Ctrl+V para colar a declaração.");
        
      } catch (e) {
        console.error(e);
        alert("Erro ao processar a imagem. Verifique se você deu permissão de acesso à área de transferência.");
      } finally { 
        setIsCapturing(false); 
      }
    }, 800); 
  };

  return (
    <div className={`min-h-screen py-8 px-4 print:bg-white print:p-0 relative transition-colors duration-500 ease-in-out ${isDarkMode ? 'bg-gray-900' : 'bg-gray-300'}`}>
      
      {/* OVERLAY DE CARREGAMENTO */}
      {isCapturing && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white transition-opacity">
          <Loader2 className="w-16 h-16 animate-spin mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold mb-2">Processando...</h2>
          <p className="text-gray-300 animate-pulse">Gerando documento...</p>
        </div>
      )}

      {/* TOOLBAR SUPERIOR */}
      <div className={`w-[794px] mx-auto mb-8 no-print p-4 rounded-xl shadow-xl border flex items-center justify-between gap-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-white/50 shadow-gray-400/50'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-700 p-2.5 rounded-lg text-white shadow-lg shadow-blue-900/50"><Mail size={20}/></div>
          <div>
            <h1 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Correio Cirion</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Gerador de Declaração</span>
              {isSaving && (
                <span className="text-[10px] text-yellow-500 animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Salvando...</span>
              )}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 items-center">
          <button 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-lg transition-all duration-300 shadow-sm ${isDarkMode ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600 hover:shadow-yellow-300/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isDarkMode ? <Sun size={18} className="fill-current"/> : <Moon size={18} className="fill-current"/>}
          </button>
          
          <button 
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 shadow-md shadow-green-600/20 transition-all duration-300 active:scale-95 flex items-center gap-2"
            title="Salvar como PDF ou Imprimir"
          >
            <Printer size={16} /> IMPRIMIR PDF
          </button>

          <button onClick={sendEmail} disabled={isCapturing} className="px-5 py-2.5 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-600 shadow-lg shadow-blue-700/30 flex items-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait">
            <Mail size={16}/> ENVIAR PARA OUTLOOK
          </button>
        </div>
      </div>

      {/* FORMULÁRIO A4 */}
      <div className="w-full mx-auto overflow-x-auto pb-10 perspective-1000">
        <div 
          ref={formRef} 
          className={`
            w-[794px] mx-auto 
            transition-colors duration-500 ease-in-out
            ${isDarkMode ? 'bg-[#1e1e1e] text-gray-200' : 'bg-white text-black'}
            ${borderColor} border-2
            print:border-none print:shadow-none print:bg-white print:text-black
            relative
          `}
          style={{
            // Efeito 3D Customizado
            boxShadow: isDarkMode 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(0,0,0,0.5)' 
              : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header Correios */}
          <div className={`p-8 border-b-2 ${borderColor} flex justify-between items-center transition-colors duration-500`}>
            <div className="flex items-center gap-4">
               <div className={`border-2 ${borderColor} p-2 bg-yellow-400 font-black italic text-base text-black shadow-sm`}>CORREIOS</div>
               <h1 className="text-4xl font-black uppercase tracking-tighter">Correios</h1>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black uppercase">Declaração de Conteúdo</h2>
            </div>
          </div>

          {/* Endereços - Grid */}
          <div className={`grid grid-cols-2 border-b-2 ${borderColor}`}>
            {/* Bloco Remetente */}
            <div className={`border-r-2 ${borderColor}`}>
              <div className={`flex justify-between items-center border-b-2 ${borderColor} ${bgHeader} py-1 px-4 transition-colors duration-500`}>
                 <h3 className={`font-bold uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Remetente</h3>
                 <div className="no-print">
                   <select 
                      className={`text-[10px] border rounded px-2 py-1 outline-none cursor-pointer font-medium transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-500 text-white hover:border-gray-400' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-500'}`}
                      onChange={(e) => { selectUnit('remetente', e.target.value); e.target.value = ""; }}
                      defaultValue=""
                   >
                     <option value="" disabled>▼ Preencher com Unidade...</option>
                     {CIRION_UNITS.map(u => <option key={`rem-${u.cnpj}`} value={u.cnpj}>{u.label}</option>)}
                   </select>
                 </div>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong className="w-20 shrink-0">NOME:</strong> 
                  <input className={`flex-1 ${inputBg} border-none p-0 focus:ring-0 font-bold uppercase no-print ${textColor}`} value={form.remetente.nome} onChange={(e)=>updateEntity('remetente','nome',e.target.value)}/>
                  <span className="hidden print:inline-block font-bold uppercase">{form.remetente.nome}</span>
                </div>
                <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong className="w-20 shrink-0">CPF/CNPJ:</strong> 
                  <input className={`flex-1 ${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={form.remetente.cnpj_cpf} onChange={(e)=>updateEntity('remetente','cnpj_cpf',e.target.value)}/>
                  <span className="hidden print:inline-block">{form.remetente.cnpj_cpf}</span>
                </div>
                <div className={`flex flex-col border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong>ENDEREÇO:</strong> 
                  <input className={`${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={form.remetente.endereco} onChange={(e)=>updateEntity('remetente','endereco',e.target.value)}/>
                  <span className="hidden print:inline-block">{form.remetente.endereco}</span>
                </div>
                <div className="flex"><strong>CIDADE/UF:</strong> <span className="ml-2 uppercase">{form.remetente.cidade}/{form.remetente.uf}</span></div>
                <div className="flex"><strong>CEP:</strong> <span className="ml-2">{form.remetente.cep}</span></div>
              </div>
            </div>

            {/* Bloco Destinatário */}
            <div className={``}>
              <div className={`flex justify-between items-center border-b-2 ${borderColor} ${bgHeader} py-1 px-4 transition-colors duration-500`}>
                 <h3 className={`font-bold uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Destinatário</h3>
                 <div className="no-print">
                   <select 
                      className={`text-[10px] border rounded px-2 py-1 outline-none cursor-pointer font-medium transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-500 text-white hover:border-gray-400' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-500'}`}
                      onChange={(e) => { selectUnit('destinatario', e.target.value); e.target.value = ""; }}
                      defaultValue=""
                   >
                     <option value="" disabled>▼ Preencher com Unidade...</option>
                     {CIRION_UNITS.map(u => <option key={`dest-${u.cnpj}`} value={u.cnpj}>{u.label}</option>)}
                   </select>
                 </div>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong className="w-20 shrink-0">NOME:</strong> 
                  <input className={`flex-1 ${inputBg} border-none p-0 focus:ring-0 font-bold uppercase no-print ${textColor}`} value={form.destinatario.nome} onChange={(e)=>updateEntity('destinatario','nome',e.target.value)}/>
                  <span className="hidden print:inline-block font-bold uppercase">{form.destinatario.nome}</span>
                </div>
                <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1 text-blue-500 print:text-blue-800`}>
                  <strong className="w-20 shrink-0">A/C:</strong> 
                  <input className={`flex-1 ${inputBg} border-none p-0 focus:ring-0 font-bold uppercase no-print ${isDarkMode ? 'text-blue-400 placeholder-blue-400/50' : 'text-blue-800 placeholder-blue-800/50'}`} placeholder="NOME DO RESPONSÁVEL" value={form.destinatario.contato||''} onChange={(e)=>updateEntity('destinatario','contato',e.target.value)}/>
                  <span className="hidden print:inline-block font-bold uppercase">{form.destinatario.contato||'---'}</span>
                </div>
                <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong className="w-20 shrink-0">CPF/CNPJ:</strong> 
                  <input className={`flex-1 ${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={form.destinatario.cnpj_cpf} onChange={(e)=>updateEntity('destinatario','cnpj_cpf',e.target.value)}/>
                  <span className="hidden print:inline-block">{form.destinatario.cnpj_cpf}</span>
                </div>
                <div className={`flex flex-col border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-1`}>
                  <strong>ENDEREÇO:</strong> 
                  <input className={`${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={form.destinatario.endereco} onChange={(e)=>updateEntity('destinatario','endereco',e.target.value)}/>
                  <span className="hidden print:inline-block">{form.destinatario.endereco}</span>
                </div>
                <div className="flex border-b border-gray-200 pb-1"><strong>CIDADE/UF:</strong> <span className="ml-2 uppercase">{form.destinatario.cidade}/{form.destinatario.uf}</span></div>
                <div className="flex">
                  <strong>CEP:</strong> 
                  <input className={`${inputBg} border-none p-0 focus:ring-0 ml-2 no-print ${textColor}`} value={form.destinatario.cep} onChange={(e)=>updateEntity('destinatario','cep',e.target.value)}/>
                  <span className="hidden print:inline-block ml-2">{form.destinatario.cep}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Itens */}
          <table className={`w-full border-collapse`}>
            <thead>
              <tr className={`border-b-2 ${borderColor} ${bgHeader} text-[11px] font-bold uppercase transition-colors duration-500`}>
                <th className={`p-2 border-r-2 ${borderColor} w-12 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Item</th>
                <th className={`p-2 border-r-2 ${borderColor} text-left ${isDarkMode ? 'text-white' : 'text-black'}`}>Descrição do Conteúdo</th>
                <th className={`p-2 border-r-2 ${borderColor} w-20 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Qtd</th>
                <th className={`p-2 w-36 text-right ${isDarkMode ? 'text-white' : 'text-black'}`}>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {form.itens.map((item, idx) => (
                <tr key={item.id} className={`border-b ${borderColor} text-sm`}>
                  <td className={`p-2 border-r-2 ${borderColor} text-center font-bold`}>{idx+1}</td>
                  <td className={`p-2 border-r-2 ${borderColor}`}>
                    <input className={`w-full ${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={item.conteudo} onChange={(e)=>updateItem(item.id,'conteudo',e.target.value)}/>
                    <span className="hidden print:inline-block">{item.conteudo}</span>
                  </td>
                  <td className={`p-2 border-r-2 ${borderColor} text-center`}>
                    <input type="number" className={`w-full text-center ${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={item.quantidade} onChange={(e)=>updateItem(item.id,'quantidade',parseInt(e.target.value)||0)}/>
                    <span className="hidden print:inline-block">{item.quantidade}</span>
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    <div className="flex items-center gap-1">
                      <input className={`flex-1 text-right ${inputBg} border-none p-0 focus:ring-0 no-print ${textColor}`} value={formatBR.format(item.valor)} onChange={(e)=>updateItem(item.id,'valor',Number(e.target.value.replace(/\D/g,''))/100)}/>
                      <span className="hidden print:inline-block w-full text-right">{formatBR.format(item.valor)}</span>
                      {form.itens.length > 1 && (
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="no-print p-1.5 text-red-500 hover:bg-red-100/50 rounded-full transition-colors flex-shrink-0"
                          title="Remover Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${borderColor} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} font-bold transition-colors duration-500`}>
                <td colSpan={2} className={`p-3 text-right border-r-2 ${borderColor} text-xs`}>
                  PESO TOTAL (KG): 
                  <input className={`w-20 border ml-2 px-1 no-print text-center ${isDarkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-300'}`} placeholder="0.00" value={form.pesoTotal} onChange={(e)=>setForm(prev=>({...prev, pesoTotal:e.target.value}))}/> 
                  <span className="hidden print:inline-block ml-2">{form.pesoTotal||'0'} kg</span>
                  <span className="ml-8 uppercase">TOTAIS</span>
                </td>
                <td className={`p-3 text-center border-r-2 ${borderColor}`}>{form.itens.reduce((s,i)=>s+(i.quantidade||0),0)}</td>
                <td className="p-3 text-right font-mono text-xl">R$ {formatBR.format(form.itens.reduce((s,i)=>s+((i.quantidade||0)*(i.valor||0)),0))}</td>
              </tr>
            </tfoot>
          </table>
          <button onClick={()=>{setForm(prev=>({...prev, itens:[...prev.itens,{id:generateId(),conteudo:'',quantidade:1,valor:0}]}))}} className="m-3 no-print text-[11px] font-bold text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 uppercase">
            <Plus size={14}/> Adicionar Item
          </button>

          {/* Declaração e Assinatura */}
          <div className={`p-6 border-2 ${borderColor} m-6 ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            <p className="text-[10px] text-justify font-medium leading-relaxed mb-8">
              Declaro que não me enquadro no conceito de contribuinte de ICMS. Declaro ainda que o conteúdo não é perigoso nem proibido. Suprimir tributo é crime (Lei 8.137/90).
            </p>
            <div className="flex justify-between items-end">
              <div className={`border-b-2 ${borderColor} pb-1 text-sm flex gap-2`}>
                <strong className="text-[11px] uppercase">LOCAL/DATA:</strong> 
                <input className={`${inputBg} border-none p-0 focus:ring-0 no-print w-32 font-bold uppercase ${textColor}`} value={form.cidadeDeclaracao} onChange={(e)=>setForm(prev=>({...prev, cidadeDeclaracao:e.target.value}))}/>
                <span className="hidden print:inline-block font-bold uppercase">{form.cidadeDeclaracao}</span>, 
                <span className="font-bold uppercase">{form.dataDeclaracao}</span>
              </div>
              <div className={`w-64 border-t-2 ${borderColor} text-center relative pt-2`}>
                <div className="absolute bottom-6 left-0 right-0 h-16 flex items-end justify-center">
                  {isSigned && form.assinatura && <img src={form.assinatura} className={`max-h-full ${isDarkMode ? 'invert' : ''} print:invert-0`} alt="Assinatura"/>}
                </div>
                <span className="text-[10px] font-bold uppercase">Assinatura do Declarante</span>
                
                {/* Pad de Assinatura Flutuante */}
                {!isSigned && !isCapturing && (
                  <div className={`absolute bottom-12 right-0 w-72 border-2 ${borderColor} p-4 z-50 no-print shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <SignatureCanvas ref={sigPad} canvasProps={{width:250, height:110, className:`border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}}/>
                    <div className="flex gap-2 mt-2">
                      <button onClick={()=>sigPad.current?.clear()} className={`flex-1 text-[10px] border p-1 font-bold ${isDarkMode ? 'border-gray-500 text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Limpar</button>
                      <button onClick={()=>{const d=sigPad.current?.getTrimmedCanvas().toDataURL(); if(d){setForm(p=>({...p,assinatura:d})); setIsSigned(true);}}} className="flex-1 text-[10px] bg-blue-700 text-white p-1 font-bold hover:bg-blue-600">Confirmar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Etiquetas de Recorte */}
          <div className={`mt-10 border-t-2 border-dashed ${isDarkMode ? 'border-gray-600' : 'border-gray-500'} p-8 pt-12 relative hide-on-outlook-send`}>
             <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 flex gap-2 no-print text-[11px] font-bold uppercase ${isDarkMode ? 'bg-[#1e1e1e] text-gray-400' : 'bg-white text-gray-500'}`}>
               <Scissors size={14}/> Recorte para colar no pacote
             </div>
             <div className="grid grid-cols-2 gap-8">
                <div className={`border-2 ${borderColor} p-5`}>
                  <span className={`bg-black text-white text-[11px] px-2 py-0.5 font-bold ${isDarkMode ? 'bg-gray-200 text-black' : ''}`}>REMETENTE</span>
                  <p className="font-bold text-xl mt-3 uppercase leading-tight">{form.remetente.nome}</p>
                  <p className="text-xs font-bold mt-1">CNPJ: {form.remetente.cnpj_cpf}</p>
                  <p className="text-sm mt-3 leading-snug">{form.remetente.endereco}</p>
                  <p className="text-sm leading-snug uppercase font-bold">{form.remetente.cidade} - {form.remetente.uf}</p>
                  <p className="font-bold text-lg mt-3">CEP: {form.remetente.cep}</p>
                </div>
                <div className={`border-2 ${borderColor} p-5`}>
                  <span className={`bg-black text-white text-[11px] px-2 py-0.5 font-bold ${isDarkMode ? 'bg-gray-200 text-black' : ''}`}>DESTINATÁRIO</span>
                  <p className="font-bold text-xl mt-3 uppercase leading-tight">{form.destinatario.nome}</p>
                  <p className={`text-sm font-bold italic uppercase ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>A/C: {form.destinatario.contato||'---'}</p>
                  <p className="text-xs font-bold mt-1">CNPJ/CPF: {form.destinatario.cnpj_cpf}</p>
                  <p className="text-sm mt-3 leading-snug">{form.destinatario.endereco}</p>
                  <p className="text-sm leading-snug uppercase font-bold">{form.destinatario.cidade} - {form.destinatario.uf}</p>
                  <p className="font-bold text-lg mt-3">CEP: {form.destinatario.cep}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;