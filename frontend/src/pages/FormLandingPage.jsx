import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { leadsApi } from '@/lib/api';

const FormLandingPage = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contaLuzArquivo: null,
    monitoramentoArquivo: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.nome || !formData.email || !formData.contaLuzArquivo || !formData.monitoramentoArquivo) {
      toast.error('Preencha todos os campos obrigatórios.');
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
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm border border-slate-100 md:p-10">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Preencha o form abaixo e receba 1 mês de degustação gratuita
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome:</Label>
            <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Seu email:</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contaLuzArquivo">Foto da sua conta de luz (ou pdf):</Label>
            <Input
              id="contaLuzArquivo"
              name="contaLuzArquivo"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitoramentoArquivo">Print do seu monitoramento (do mês cheio):</Label>
            <Input
              id="monitoramentoArquivo"
              name="monitoramentoArquivo"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600">
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default FormLandingPage;
