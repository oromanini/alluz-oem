import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, LogOut, Users, FileText, Settings, LayoutDashboard, 
  Download, Filter, Search, Edit2, Trash2, Plus, Save, X,
  ChevronDown, Check, MessageCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { authApi, contentApi, plansApi, leadsApi } from '@/lib/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('leads');
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [user, setUser] = useState(null);

  // Leads state
  const [leads, setLeads] = useState([]);
  const [leadFilters, setLeadFilters] = useState({ status: '', plano: '', search: '' });
  const [filteredLeads, setFilteredLeads] = useState([]);

  // Content state
  const [content, setContent] = useState({});
  const [editingContent, setEditingContent] = useState(null);
  const [contentValue, setContentValue] = useState('');

  // Plans state
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    nome: '',
    preco: '',
    descricao: [''],
    ordem: 1,
    destaque: false,
    badge: ''
  });

  // WhatsApp state
  const [whatsappConfig, setWhatsappConfig] = useState({
    numero: '',
    mensagem_template: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, leadFilters]);

  const checkAuth = async () => {
    const token = localStorage.getItem('alluz_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.data);
      loadData();
    } catch (error) {
      localStorage.removeItem('alluz_token');
      navigate('/admin');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsRes, contentRes, plansRes] = await Promise.all([
        leadsApi.getAll(),
        contentApi.getAll(),
        plansApi.getAll()
      ]);
      setLeads(leadsRes.data);
      setContent(contentRes.data);
      setPlans(plansRes.data);
      setWhatsappConfig({
        numero: contentRes.data.whatsapp_numero || '',
        mensagem_template: contentRes.data.whatsapp_mensagem || ''
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];
    
    if (leadFilters.status) {
      filtered = filtered.filter(l => l.status === leadFilters.status);
    }
    if (leadFilters.plano) {
      filtered = filtered.filter(l => l.plano === leadFilters.plano);
    }
    if (leadFilters.search) {
      const search = leadFilters.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.nome.toLowerCase().includes(search) ||
        l.empresa.toLowerCase().includes(search) ||
        l.telefone.includes(search) ||
        l.cidade.toLowerCase().includes(search)
      );
    }
    
    setFilteredLeads(filtered);
  };

  const handleLogout = () => {
    localStorage.removeItem('alluz_token');
    navigate('/admin');
  };

  const handleUpdateLeadStatus = async (leadId, status) => {
    try {
      await leadsApi.updateStatus(leadId, status);
      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await leadsApi.exportCsv();
      const blob = new Blob([response.data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-alluz-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('Arquivo exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar');
    }
  };

  const handleSaveContent = async (key, value) => {
    try {
      await contentApi.update(key, value);
      setContent(prev => ({ ...prev, [key]: value }));
      setEditingContent(null);
      toast.success('Conteúdo atualizado');
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleSaveWhatsApp = async () => {
    try {
      await contentApi.updateWhatsApp(whatsappConfig.numero, whatsappConfig.mensagem_template);
      toast.success('WhatsApp atualizado');
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan.id);
      setPlanForm({
        nome: plan.nome,
        preco: plan.preco,
        descricao: plan.descricao,
        ordem: plan.ordem,
        destaque: plan.destaque,
        badge: plan.badge || ''
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        nome: '',
        preco: '',
        descricao: [''],
        ordem: plans.length + 1,
        destaque: false,
        badge: ''
      });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.nome || !planForm.preco) {
      toast.error('Preencha nome e preço');
      return;
    }

    try {
      const data = {
        ...planForm,
        descricao: planForm.descricao.filter(d => d.trim())
      };

      if (editingPlan) {
        await plansApi.update(editingPlan, data);
        setPlans(plans.map(p => p.id === editingPlan ? { ...p, ...data } : p));
      } else {
        const response = await plansApi.create(data);
        setPlans([...plans, response.data]);
      }
      setShowPlanModal(false);
      toast.success('Plano salvo com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar plano');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      await plansApi.delete(planId);
      setPlans(plans.filter(p => p.id !== planId));
      toast.success('Plano excluído');
    } catch (error) {
      toast.error('Erro ao excluir plano');
    }
  };

  const addDescriptionItem = () => {
    setPlanForm(prev => ({
      ...prev,
      descricao: [...prev.descricao, '']
    }));
  };

  const updateDescriptionItem = (index, value) => {
    setPlanForm(prev => ({
      ...prev,
      descricao: prev.descricao.map((d, i) => i === index ? value : d)
    }));
  };

  const removeDescriptionItem = (index) => {
    setPlanForm(prev => ({
      ...prev,
      descricao: prev.descricao.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      novo: 'bg-blue-100 text-blue-700',
      contatado: 'bg-amber-100 text-amber-700',
      fechado: 'bg-green-100 text-green-700',
      perdido: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const contentLabels = {
    hero_titulo: 'Título do Hero',
    hero_subtitulo: 'Subtítulo do Hero',
    hero_microcopy: 'Microcopy do Hero',
    problema_titulo: 'Título - Problema',
    problema_texto: 'Texto - Problema',
    como_funciona_titulo: 'Título - Como Funciona',
    nao_incluso_titulo: 'Título - Não Incluso',
    faq_titulo: 'Título - FAQ',
    footer_razao_social: 'Razão Social (Rodapé)',
    footer_cnpj: 'CNPJ (Rodapé)'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Admin Alluz</h1>
                <p className="text-xs text-gray-500">Painel Administrativo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                target="_blank"
                className="text-sm text-gray-500 hover:text-amber-500 transition-colors hidden sm:block"
              >
                Ver site →
              </a>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Novos</p>
                  <p className="text-3xl font-bold text-blue-600">{leads.filter(l => l.status === 'novo').length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Fechados</p>
                  <p className="text-3xl font-bold text-green-600">{leads.filter(l => l.status === 'fechado').length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Planos Ativos</p>
                  <p className="text-3xl font-bold text-gray-900">{plans.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="leads" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="planos" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="conteudo" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Leads Capturados</CardTitle>
                    <CardDescription>Gerencie os leads do seu funil</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={loadData}
                      data-testid="refresh-leads-btn"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar
                    </Button>
                    <Button 
                      onClick={handleExportCSV}
                      className="bg-amber-500 hover:bg-amber-600"
                      data-testid="export-csv-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      value={leadFilters.search}
                      onChange={(e) => setLeadFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                      data-testid="search-leads-input"
                    />
                  </div>
                  <Select 
                    value={leadFilters.status} 
                    onValueChange={(value) => setLeadFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="filter-status-select">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={leadFilters.plano} 
                    onValueChange={(value) => setLeadFilters(prev => ({ ...prev, plano: value }))}
                  >
                    <SelectTrigger data-testid="filter-plano-select">
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell>{lead.empresa}</TableCell>
                          <TableCell>
                            <a 
                              href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-600 hover:underline"
                            >
                              {lead.telefone}
                            </a>
                          </TableCell>
                          <TableCell>{lead.cidade}</TableCell>
                          <TableCell>{lead.plano}</TableCell>
                          <TableCell>
                            <Select 
                              value={lead.status} 
                              onValueChange={(value) => handleUpdateLeadStatus(lead.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <Badge className={getStatusBadge(lead.status)}>
                                  {lead.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo">Novo</SelectItem>
                                <SelectItem value="contatado">Contatado</SelectItem>
                                <SelectItem value="fechado">Fechado</SelectItem>
                                <SelectItem value="perdido">Perdido</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredLeads.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            Nenhum lead encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="planos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Planos</CardTitle>
                    <CardDescription>Gerencie os planos de assinatura</CardDescription>
                  </div>
                  <Button 
                    onClick={() => openPlanModal()}
                    className="bg-amber-500 hover:bg-amber-600"
                    data-testid="add-plan-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.sort((a, b) => a.ordem - b.ordem).map((plan) => (
                    <div 
                      key={plan.id}
                      className={`bg-white p-6 rounded-xl border-2 ${plan.destaque ? 'border-amber-500' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          {plan.badge && (
                            <Badge className="bg-amber-500 text-white mb-2">{plan.badge}</Badge>
                          )}
                          <h3 className="font-bold text-gray-900">{plan.nome}</h3>
                          <p className="text-2xl font-bold text-amber-600">{plan.preco}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openPlanModal(plan)}
                            data-testid={`edit-plan-${plan.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-500 hover:text-red-700"
                            data-testid={`delete-plan-${plan.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {plan.descricao.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="conteudo">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do Site</CardTitle>
                <CardDescription>Edite os textos da landing page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(contentLabels).map(([key, label]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium text-gray-700">{label}</Label>
                        {editingContent === key ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveContent(key, contentValue)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEditingContent(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingContent(key);
                              setContentValue(content[key] || '');
                            }}
                            data-testid={`edit-content-${key}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingContent === key ? (
                        <Textarea
                          value={contentValue}
                          onChange={(e) => setContentValue(e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                      ) : (
                        <p className="text-gray-600 text-sm">{content[key] || '-'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle>Configuração WhatsApp</CardTitle>
                <CardDescription>Configure o número e mensagem padrão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="font-medium text-gray-700">Número do WhatsApp</Label>
                  <p className="text-xs text-gray-500 mb-2">Formato: 5544999999999 (código país + DDD + número)</p>
                  <Input
                    value={whatsappConfig.numero}
                    onChange={(e) => setWhatsappConfig(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="5544988574869"
                    data-testid="whatsapp-numero-input"
                  />
                </div>
                <div>
                  <Label className="font-medium text-gray-700">Mensagem Padrão</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Variáveis disponíveis: {'{nome}'}, {'{empresa}'}, {'{telefone}'}, {'{cidade}'}, {'{plano}'}, {'{kwp}'}, {'{concessionaria}'}, {'{obs}'}
                  </p>
                  <Textarea
                    value={whatsappConfig.mensagem_template}
                    onChange={(e) => setWhatsappConfig(prev => ({ ...prev, mensagem_template: e.target.value }))}
                    rows={5}
                    placeholder="Olá! Sou {nome}..."
                    data-testid="whatsapp-mensagem-input"
                  />
                </div>
                <Button 
                  onClick={handleSaveWhatsApp}
                  className="bg-amber-500 hover:bg-amber-600"
                  data-testid="save-whatsapp-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Plan Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Plano *</Label>
              <Input
                value={planForm.nome}
                onChange={(e) => setPlanForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Plano Essencial"
                className="mt-1"
                data-testid="plan-nome-input"
              />
            </div>
            <div>
              <Label>Preço *</Label>
              <Input
                value={planForm.preco}
                onChange={(e) => setPlanForm(prev => ({ ...prev, preco: e.target.value }))}
                placeholder="Ex: R$ 49,90/mês"
                className="mt-1"
                data-testid="plan-preco-input"
              />
            </div>
            <div>
              <Label>Ordem de Exibição</Label>
              <Input
                type="number"
                value={planForm.ordem}
                onChange={(e) => setPlanForm(prev => ({ ...prev, ordem: parseInt(e.target.value) || 1 }))}
                min={1}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Destacar Plano</Label>
                <p className="text-xs text-gray-500">Aparece com borda dourada</p>
              </div>
              <Switch
                checked={planForm.destaque}
                onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, destaque: checked }))}
              />
            </div>
            <div>
              <Label>Badge (opcional)</Label>
              <Input
                value={planForm.badge}
                onChange={(e) => setPlanForm(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Ex: Mais escolhido"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Benefícios</Label>
              <div className="space-y-2 mt-2">
                {planForm.descricao.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateDescriptionItem(index, e.target.value)}
                      placeholder="Descreva um benefício"
                    />
                    {planForm.descricao.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeDescriptionItem(index)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addDescriptionItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar benefício
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePlan}
              className="bg-amber-500 hover:bg-amber-600"
              data-testid="save-plan-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
