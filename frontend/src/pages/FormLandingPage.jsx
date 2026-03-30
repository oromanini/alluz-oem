import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { leadsApi } from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Dados pessoais', description: 'Vamos começar com suas informações básicas.' },
  { id: 2, title: 'Conta de luz', description: 'Envie uma foto ou PDF da sua conta de luz.' },
  { id: 3, title: 'Monitoramento', description: 'Agora envie o print do monitoramento do mês cheio.' },
];

const FormLandingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contaLuzArquivo: null,
    monitoramentoArquivo: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => (currentStep / STEPS.length) * 100, [currentStep]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.nome || !formData.email) {
        toast.error('Preencha nome e email para continuar.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!formData.contaLuzArquivo) {
        toast.error('Anexe sua conta de luz para avançar.');
        return false;
      }
      return true;
    }

    if (!formData.monitoramentoArquivo) {
      toast.error('Anexe o print de monitoramento para finalizar.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    try {
      await leadsApi.createTasting(formData);
      toast.success('Cadastro enviado com sucesso!');
      setFormData({
        nome: '',
        email: '',
        contaLuzArquivo: null,
        monitoramentoArquivo: null,
      });
      setCurrentStep(1);
      event.target.reset();
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
      } else {
        toast.error('Não foi possível enviar agora. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10 md:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 md:p-10">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Ganhe 1 mês de degustação gratuita</h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">Preencha o formulário em 3 passos rápidos.</p>

        <div className="mt-8">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-5 grid grid-cols-3 gap-2 text-center">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <li key={step.id} className="space-y-2">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isActive || isCompleted ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step.id}
                  </div>
                  <p className={`text-xs font-medium md:text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {step.title}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 md:p-5">
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">{STEPS[currentStep - 1].title}</h2>
            <p className="mt-1 text-sm text-slate-600">{STEPS[currentStep - 1].description}</p>

            <div className="mt-5 space-y-4">
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Seu nome</Label>
                    <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Seu email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="contaLuzArquivo">Foto da conta de luz (ou PDF)</Label>
                  <Input
                    id="contaLuzArquivo"
                    name="contaLuzArquivo"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-2">
                  <Label htmlFor="monitoramentoArquivo">Print do monitoramento (mês cheio)</Label>
                  <Input
                    id="monitoramentoArquivo"
                    name="monitoramentoArquivo"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="min-w-28"
            >
              Voltar
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} className="min-w-28 bg-amber-500 hover:bg-amber-600">
                Próximo
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="min-w-28 bg-amber-500 hover:bg-amber-600">
                {submitting ? 'Enviando...' : 'Finalizar'}
              </Button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
};

export default FormLandingPage;
