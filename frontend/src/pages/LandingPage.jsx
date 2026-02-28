import { useState, useEffect } from 'react';
import { Sun, Menu, X, Phone, Mail, MapPin, ChevronRight, Check, AlertCircle, MessageCircle, Activity, ShieldCheck, Clock, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { contentApi, plansApi, leadsApi } from '@/lib/api';

const LandingPage = () => {
  const [content, setContent] = useState({});
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    empresa: '',
    telefone: '',
    cidade: '',
    plano: '',
    potencia: '',
    concessionaria: '',
    observacoes: '',
    honeypot: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentRes, plansRes] = await Promise.all([
        contentApi.getAll(),
        plansApi.getAll()
      ]);
      setContent(contentRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFormWithPlan = (planName) => {
    setSelectedPlan(planName);
    setFormData(prev => ({ ...prev, plano: planName }));
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateWhatsAppUrl = (data) => {
    const numero = content.whatsapp_numero || '5544988574869';
    let mensagem = content.whatsapp_mensagem || 'Olá! Sou {nome} da empresa {empresa}. Telefone: {telefone}, Cidade: {cidade}. Tenho interesse no {plano}. Potência: {kwp}. Concessionária: {concessionaria}. Observações: {obs}. Quero assinar o plano de acompanhamento.';
    
    mensagem = mensagem
      .replace('{nome}', data.nome)
      .replace('{empresa}', data.empresa)
      .replace('{telefone}', data.telefone)
      .replace('{cidade}', data.cidade)
      .replace('{plano}', data.plano)
      .replace('{kwp}', data.potencia || 'Não informado')
      .replace('{concessionaria}', data.concessionaria || 'Não informada')
      .replace('{obs}', data.observacoes || 'Nenhuma');
    
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.honeypot) {
      return;
    }

    if (!formData.nome || !formData.empresa || !formData.telefone || !formData.cidade || !formData.plano) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      await leadsApi.create(formData);
      const url = generateWhatsAppUrl(formData);
      setWhatsappUrl(url);
      setShowModal(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        window.open(url, '_blank');
      }, 1500);
      
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Muitas tentativas. Por favor, aguarde um momento.');
      } else {
        toast.error('Erro ao enviar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const parseJson = (str, fallback = []) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const comoFuncionaPassos = parseJson(content.como_funciona_passos, [
    { numero: "1", titulo: "Preencha o formulário", descricao: "Informe seus dados e o plano desejado" },
    { numero: "2", titulo: "Falamos pelo WhatsApp", descricao: "Confirmamos seus dados e tiramos dúvidas" },
    { numero: "3", titulo: "Iniciamos o acompanhamento", descricao: "Começamos o monitoramento mensal do seu sistema" },
    { numero: "4", titulo: "Receba orientações", descricao: "Você recebe informativos e orientações periódicas" }
  ]);

  const naoInclusoItens = parseJson(content.nao_incluso_itens, [
    "Não inclui deslocamento",
    "Não inclui manutenção corretiva presencial",
    "Manutenção avulsa: a negociar"
  ]);

  const faqItens = parseJson(content.faq_itens, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <a href="/" className="flex items-center gap-2 group" data-testid="logo-link">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:block">Alluz Energia</span>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#planos" className="text-gray-600 hover:text-amber-500 transition-colors font-medium">Planos</a>
              <a href="#como-funciona" className="text-gray-600 hover:text-amber-500 transition-colors font-medium">Como funciona</a>
              <a href="#faq" className="text-gray-600 hover:text-amber-500 transition-colors font-medium">FAQ</a>
            </nav>

            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setShowModal(true)} 
                className="hidden sm:flex bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6"
                data-testid="header-cta-btn"
              >
                Quero assinar
              </Button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600"
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-amber-500 py-2 font-medium">Planos</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-amber-500 py-2 font-medium">Como funciona</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-amber-500 py-2 font-medium">FAQ</a>
              <Button 
                onClick={() => { setShowModal(true); setMobileMenuOpen(false); }} 
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold w-full mt-2"
                data-testid="mobile-cta-btn"
              >
                Quero assinar
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 hero-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Activity className="w-4 h-4" />
                Monitoramento Remoto
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="hero-title">
                {content.hero_titulo || 'Acompanhamento remoto do seu sistema solar'}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8" data-testid="hero-subtitle">
                {content.hero_subtitulo || 'Monitoramento mensal, excedente/créditos e orientação para você não ficar sem suporte'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button 
                  onClick={() => setShowModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                  data-testid="hero-cta-btn"
                >
                  Quero assinar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a 
                  href="#planos"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:border-amber-500 hover:text-amber-600 transition-colors"
                >
                  Ver planos
                </a>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2" data-testid="hero-microcopy">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                {content.hero_microcopy || 'Sem deslocamento. Tudo remoto.'}
              </p>
            </div>
            <div className="relative animate-fade-in-up animation-delay-200">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80" 
                  alt="Sistema solar residencial"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 animate-fade-in animation-delay-400">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Geração monitorada</p>
                    <p className="font-bold text-gray-900">24/7 em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problema/Dor Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6" data-testid="problema-titulo">
              {content.problema_titulo || 'Comprou solar e ficou sem suporte?'}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-12" data-testid="problema-texto">
              {content.problema_texto || 'App offline, geração baixa, créditos que não batem? É comum empresas terem fechado e o cliente ficar órfão. A Alluz Energia está aqui para ajudar.'}
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-gray-700 font-medium">App do inversor offline</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Activity className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-gray-700 font-medium">Geração abaixo do esperado</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-gray-700 font-medium">Créditos que não batem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-testid="como-funciona-titulo">
              {content.como_funciona_titulo || 'Como funciona'}
            </h2>
            <p className="text-lg text-gray-600">Simples e sem burocracia</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {comoFuncionaPassos.map((passo, index) => (
              <div key={index} className="relative group">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all h-full">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-2xl font-bold text-white">{passo.numero}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{passo.titulo}</h3>
                  <p className="text-gray-600">{passo.descricao}</p>
                </div>
                {index < comoFuncionaPassos.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Escolha seu plano</h2>
            <p className="text-lg text-gray-600">Acompanhamento profissional para seu sistema solar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={plan.id}
                className={`bg-white p-8 rounded-2xl border-2 flex flex-col h-full transition-all hover:scale-[1.02] ${
                  plan.destaque 
                    ? 'border-amber-500 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] relative' 
                    : 'border-gray-200 shadow-lg hover:border-amber-300'
                }`}
                data-testid={`plan-card-${index}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-amber-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.nome}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.preco.split('/')[0]}</span>
                    <span className="text-gray-500">/{plan.preco.split('/')[1] || 'mês'}</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.descricao.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => openFormWithPlan(plan.nome)}
                  className={`w-full py-6 text-lg font-semibold rounded-xl transition-all ${
                    plan.destaque
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                  data-testid={`plan-cta-${index}`}
                >
                  Assinar este plano
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que NÃO está incluso */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-testid="nao-incluso-titulo">
                {content.nao_incluso_titulo || 'O que NÃO está incluso'}
              </h2>
              <p className="text-lg text-gray-600">Transparência total com você</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <ul className="space-y-4">
                {naoInclusoItens.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-0">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-testid="faq-titulo">
                {content.faq_titulo || 'Perguntas Frequentes'}
              </h2>
              <p className="text-lg text-gray-600">Tire suas dúvidas</p>
            </div>
            <Accordion type="single" collapsible className="space-y-4" data-testid="faq-accordion">
              {faqItens.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-white rounded-xl border border-gray-200 px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-amber-600 py-5">
                    {item.pergunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-5">
                    {item.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 md:py-24 bg-amber-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para ter suporte profissional?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Não deixe seu sistema solar sem acompanhamento. Fale conosco agora mesmo.
            </p>
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-white text-amber-600 hover:bg-gray-100 font-semibold text-lg px-10 py-6 rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              data-testid="final-cta-btn"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Quero assinar agora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl">Alluz Energia</span>
              </div>
              <p className="text-gray-400 text-sm">
                {content.footer_razao_social || 'Alluz Energia Sustentável e Tecnologia da Informacao'}
              </p>
              <p className="text-gray-400 text-sm">
                CNPJ: {content.footer_cnpj || '34.782.317/0001-49'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2">
                <li><a href="#planos" className="text-gray-400 hover:text-amber-500 transition-colors">Planos</a></li>
                <li><a href="#como-funciona" className="text-gray-400 hover:text-amber-500 transition-colors">Como funciona</a></li>
                <li><a href="#faq" className="text-gray-400 hover:text-amber-500 transition-colors">FAQ</a></li>
                <li><a href="/privacidade" className="text-gray-400 hover:text-amber-500 transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <a 
                href={`https://wa.me/${content.whatsapp_numero || '5544988574869'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-500 transition-colors"
                data-testid="footer-whatsapp-link"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Alluz Energia. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Lead Form Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Quero assinar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4" data-testid="lead-form">
            {/* Honeypot */}
            <input 
              type="text" 
              name="honeypot" 
              value={formData.honeypot}
              onChange={handleInputChange}
              className="hidden" 
              tabIndex={-1}
              autoComplete="off"
            />
            
            <div>
              <Label htmlFor="nome" className="text-gray-700">Nome *</Label>
              <Input 
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                className="mt-1"
                required
                data-testid="input-nome"
              />
            </div>

            <div>
              <Label htmlFor="empresa" className="text-gray-700">Empresa / CNPJ *</Label>
              <Input 
                id="empresa"
                name="empresa"
                value={formData.empresa}
                onChange={handleInputChange}
                placeholder="Nome da empresa ou 'não tenho'"
                className="mt-1"
                required
                data-testid="input-empresa"
              />
            </div>

            <div>
              <Label htmlFor="telefone" className="text-gray-700">Telefone (WhatsApp) *</Label>
              <Input 
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(44) 99999-9999"
                className="mt-1"
                required
                data-testid="input-telefone"
              />
            </div>

            <div>
              <Label htmlFor="cidade" className="text-gray-700">Cidade *</Label>
              <Input 
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
                placeholder="Sua cidade"
                className="mt-1"
                required
                data-testid="input-cidade"
              />
            </div>

            <div>
              <Label htmlFor="plano" className="text-gray-700">Plano de interesse *</Label>
              <Select 
                value={formData.plano} 
                onValueChange={(value) => handleSelectChange('plano', value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-plano">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.nome}>{plan.nome} - {plan.preco}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="potencia" className="text-gray-700">Potência do sistema (kWp) - Opcional</Label>
              <Input 
                id="potencia"
                name="potencia"
                value={formData.potencia}
                onChange={handleInputChange}
                placeholder="Ex: 10 kWp (até 75 kWp)"
                className="mt-1"
                data-testid="input-potencia"
              />
            </div>

            <div>
              <Label htmlFor="concessionaria" className="text-gray-700">Concessionária - Opcional</Label>
              <Input 
                id="concessionaria"
                name="concessionaria"
                value={formData.concessionaria}
                onChange={handleInputChange}
                placeholder="Ex: Copel, Cemig, etc."
                className="mt-1"
                data-testid="input-concessionaria"
              />
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-gray-700">Observações / Dor principal - Opcional</Label>
              <Textarea 
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleInputChange}
                placeholder="Conte-nos sobre seu sistema ou problema"
                className="mt-1"
                rows={3}
                data-testid="input-observacoes"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-6 text-lg rounded-xl"
              disabled={submitting}
              data-testid="submit-form-btn"
            >
              {submitting ? (
                <>
                  <div className="spinner mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar e ir para WhatsApp
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Obrigado!</h2>
            <p className="text-gray-600 mb-6">
              Seu cadastro foi realizado com sucesso. Você será redirecionado para o WhatsApp em instantes...
            </p>
            <Button 
              onClick={() => window.open(whatsappUrl, '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl"
              data-testid="goto-whatsapp-btn"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Ir para WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
