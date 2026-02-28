import { Sun } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Alluz Energia</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="text-lg mb-6">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Informações que Coletamos</h2>
            <p>
              Ao utilizar nosso formulário de contato, coletamos as seguintes informações:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Nome completo</li>
              <li>Nome da empresa ou CNPJ</li>
              <li>Telefone (WhatsApp)</li>
              <li>Cidade</li>
              <li>Plano de interesse</li>
              <li>Potência do sistema solar (opcional)</li>
              <li>Concessionária (opcional)</li>
              <li>Observações (opcional)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Como Usamos suas Informações</h2>
            <p>
              Utilizamos suas informações para:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Entrar em contato via WhatsApp para discutir os serviços</li>
              <li>Personalizar a proposta de acordo com suas necessidades</li>
              <li>Prestar suporte técnico relacionado ao seu sistema solar</li>
              <li>Enviar informações relevantes sobre nossos serviços</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Compartilhamento de Dados</h2>
            <p>
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. 
              Seus dados são utilizados exclusivamente para a prestação de nossos serviços.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações 
              contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Seus Direitos</h2>
            <p>
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Solicitar acesso aos seus dados pessoais</li>
              <li>Solicitar a correção de dados incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Retirar seu consentimento a qualquer momento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contato</h2>
            <p>
              Para questões relacionadas à privacidade, entre em contato conosco pelo WhatsApp 
              disponível em nosso site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Recomendamos que você revise 
              esta página regularmente para estar ciente de quaisquer alterações.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a 
            href="/" 
            className="text-amber-500 hover:text-amber-600 font-medium transition-colors"
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
