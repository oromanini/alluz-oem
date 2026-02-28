# PRD - Alluz Energia Landing Page

## Problema Original
Criar uma landing page de vendas completa com CMS/admin para os planos de pós-venda remoto da Alluz Energia. Objetivo: converter visitantes em leads via WhatsApp.

## Arquitetura
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI + SQLite
- **Autenticação:** JWT (admin/admin123)
- **Database:** SQLite local (alluz.db)

## User Personas
1. **Cliente Solar:** Proprietário de sistema fotovoltaico buscando suporte
2. **Admin Alluz:** Gestor que gerencia leads e conteúdo

## Core Requirements
- [x] Landing page com Hero, Problema, Como Funciona, Planos, FAQ, Footer
- [x] Formulário modal de captura de leads
- [x] Redirecionamento para WhatsApp com mensagem pré-preenchida
- [x] Admin CMS para editar conteúdo, planos, WhatsApp config
- [x] Gestão de leads com filtros e exportação CSV
- [x] Rate limiting e honeypot anti-spam
- [x] JWT authentication para admin

## O Que Foi Implementado (28/02/2026)
- Landing page completa com todas as seções
- 3 planos seed: Essencial (R$ 49,90), Avançado (R$ 79,90), Completo (R$ 99,90)
- Modal de formulário de lead com todos os campos
- Admin dashboard com 4 tabs: Leads, Planos, Conteúdo, WhatsApp
- CRUD completo para planos
- Edição de conteúdo do site
- Exportação CSV de leads
- Filtros por status e plano
- WhatsApp config editável

## Backlog Priorizado
### P0 (Crítico) - Concluído
- [x] Landing page funcional
- [x] Captura de leads
- [x] Admin básico

### P1 (Importante)
- [ ] Integração com Google Analytics
- [ ] Meta Pixel para remarketing
- [ ] Notificações por email quando novo lead

### P2 (Nice to have)
- [ ] Dashboard com gráficos de conversão
- [ ] Multi-usuário admin
- [ ] Histórico de alterações no CMS
- [ ] Integração com CRM

## Próximos Passos
1. Configurar domínio próprio
2. Adicionar tracking de conversão
3. Implementar notificações de novos leads
