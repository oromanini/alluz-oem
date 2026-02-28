import requests
import sys
import json
from datetime import datetime

class AlluzAPITester:
    def __init__(self):
        # Use the public endpoint from frontend .env
        self.base_url = "https://pos-venda-energia.preview.emergentagent.com/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                return self.log_test(name, True), response.json() if response.text else {}
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                if response.text:
                    details += f" - {response.text[:200]}"
                return self.log_test(name, False, details), {}

        except requests.exceptions.Timeout:
            return self.log_test(name, False, "Request timeout (30s)"), {}
        except requests.exceptions.ConnectionError:
            return self.log_test(name, False, "Connection error - server may be down"), {}
        except Exception as e:
            return self.log_test(name, False, f"Exception: {str(e)}"), {}

    def test_basic_api(self):
        """Test basic API connectivity"""
        success, _ = self.run_test("API Root", "GET", "", 200)
        return success

    def test_content_api(self):
        """Test content API (public)"""
        success, response = self.run_test("Get Site Content", "GET", "content", 200)
        if success:
            required_keys = ['hero_titulo', 'hero_subtitulo', 'whatsapp_numero']
            for key in required_keys:
                if key not in response:
                    self.log_test(f"Content contains {key}", False, f"Missing key: {key}")
                else:
                    self.log_test(f"Content contains {key}", True)
        return success

    def test_plans_api(self):
        """Test plans API (public)"""
        success, response = self.run_test("Get Plans", "GET", "plans", 200)
        if success and isinstance(response, list):
            if len(response) >= 3:
                self.log_test("Plans count (>=3)", True, f"Found {len(response)} plans")
                # Check plan structure
                for i, plan in enumerate(response):
                    required_fields = ['id', 'nome', 'preco', 'descricao', 'ordem']
                    missing = [field for field in required_fields if field not in plan]
                    if missing:
                        self.log_test(f"Plan {i+1} structure", False, f"Missing: {missing}")
                    else:
                        self.log_test(f"Plan {i+1} structure", True)
            else:
                self.log_test("Plans count (>=3)", False, f"Found only {len(response)} plans")
        return success

    def test_login(self):
        """Test admin login"""
        login_data = {"username": "admin", "password": "admin123"}
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Token received", True)
            return True
        else:
            self.log_test("Token received", False, "No access_token in response")
            return False

    def test_auth_me(self):
        """Test authenticated user info"""
        if not self.token:
            return self.log_test("Auth Me (requires login)", False, "No token available")
        
        success, response = self.run_test("Get Auth User", "GET", "auth/me", 200)
        if success and 'username' in response:
            self.log_test("User info contains username", True)
        return success

    def test_lead_creation(self):
        """Test lead creation (public with rate limiting)"""
        timestamp = datetime.now().strftime("%H%M%S")
        lead_data = {
            "nome": f"Test Lead {timestamp}",
            "empresa": f"Test Company {timestamp}",
            "telefone": "44999887766",
            "cidade": "Maringá",
            "plano": "Plano Essencial",
            "potencia": "10 kWp",
            "concessionaria": "Copel",
            "observacoes": "Teste de API"
        }
        
        success, response = self.run_test("Create Lead", "POST", "leads", 201, lead_data)
        if success and 'id' in response:
            self.log_test("Lead creation returns ID", True)
            # Store lead ID for later tests
            self.created_lead_id = response['id']
            return True
        return success

    def test_admin_leads(self):
        """Test admin leads management"""
        if not self.token:
            return self.log_test("Admin Leads (requires login)", False, "No token available")
        
        success, response = self.run_test("Get Admin Leads", "GET", "admin/leads", 200)
        if success and isinstance(response, list):
            self.log_test("Leads response is array", True, f"Found {len(response)} leads")
            
            # Test lead status update if we have leads
            if hasattr(self, 'created_lead_id'):
                update_success, _ = self.run_test(
                    "Update Lead Status", 
                    "PATCH", 
                    f"admin/leads/{self.created_lead_id}", 
                    200,
                    {"status": "contatado"}
                )
                return update_success
        return success

    def test_csv_export(self):
        """Test CSV export functionality"""
        if not self.token:
            return self.log_test("CSV Export (requires login)", False, "No token available")
        
        success, response = self.run_test("Export Leads CSV", "GET", "admin/leads/export", 200)
        if success and 'csv' in response:
            self.log_test("CSV export contains data", True)
        return success

    def test_admin_content_management(self):
        """Test content management"""
        if not self.token:
            return self.log_test("Content Management (requires login)", False, "No token available")
        
        # Test content update
        content_data = {
            "key": "hero_titulo", 
            "value": "Test Title Update"
        }
        success, _ = self.run_test("Update Content", "PUT", "admin/content", 200, content_data)
        
        if success:
            # Verify the change by getting content again
            verify_success, response = self.run_test("Verify Content Update", "GET", "content", 200)
            if verify_success and response.get('hero_titulo') == "Test Title Update":
                self.log_test("Content update verified", True)
            else:
                self.log_test("Content update verified", False, "Content not updated")
        
        return success

    def test_admin_plans_management(self):
        """Test plans management (CRUD operations)"""
        if not self.token:
            return self.log_test("Plans Management (requires login)", False, "No token available")
        
        # Create a test plan
        test_plan = {
            "nome": "Plano Teste API",
            "preco": "R$ 19,90/mês",
            "descricao": ["Teste de API", "Funcionalidade completa"],
            "ordem": 99,
            "destaque": False,
            "badge": "Teste"
        }
        
        create_success, create_response = self.run_test("Create Plan", "POST", "admin/plans", 201, test_plan)
        
        if create_success and 'id' in create_response:
            plan_id = create_response['id']
            self.log_test("Plan creation returns ID", True)
            
            # Update the plan
            test_plan['nome'] = "Plano Teste API Updated"
            update_success, _ = self.run_test("Update Plan", "PUT", f"admin/plans/{plan_id}", 200, test_plan)
            
            # Delete the plan
            delete_success, _ = self.run_test("Delete Plan", "DELETE", f"admin/plans/{plan_id}", 200)
            
            return create_success and update_success and delete_success
        
        return create_success

    def test_whatsapp_config(self):
        """Test WhatsApp configuration"""
        if not self.token:
            return self.log_test("WhatsApp Config (requires login)", False, "No token available")
        
        whatsapp_data = {
            "numero": "5544988574869",
            "mensagem_template": "Teste de mensagem API: {nome} - {plano}"
        }
        
        success, _ = self.run_test("Update WhatsApp Config", "PUT", "admin/whatsapp", 200, whatsapp_data)
        return success

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Alluz Energia API Tests")
        print("=" * 50)
        
        # Test basic connectivity
        if not self.test_basic_api():
            print("❌ Basic API test failed - stopping tests")
            return False
        
        # Test public APIs
        print("\n📖 Testing Public APIs...")
        self.test_content_api()
        self.test_plans_api()
        self.test_lead_creation()
        
        # Test authentication
        print("\n🔐 Testing Authentication...")
        if self.test_login():
            self.test_auth_me()
            
            # Test admin APIs
            print("\n👑 Testing Admin APIs...")
            self.test_admin_leads()
            self.test_csv_export()
            self.test_admin_content_management()
            self.test_admin_plans_management()
            self.test_whatsapp_config()
        else:
            print("❌ Login failed - skipping admin tests")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed")
            return False

def main():
    tester = AlluzAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())