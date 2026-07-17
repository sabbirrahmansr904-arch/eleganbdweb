import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PixelTracker from './components/PixelTracker';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProductProvider } from './contexts/ProductContext';
import { OrderProvider } from './contexts/OrderContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { CartProvider } from './contexts/CartContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { BannerProvider } from './contexts/BannerContext';
import { CategoryProvider } from './contexts/CategoryContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { ExpenseProvider } from './contexts/ExpenseContext';

// Layouts
import AdminLayout from './components/admin/AdminLayout';
import MainLayout from './components/MainLayout';
import ScrollToTop from './components/ScrollToTop';

// Public Pages
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import TrackOrder from './pages/TrackOrder';
import About from './pages/About';
import Contact from './pages/Contact';
import Support from './pages/Support';
import FastDelivery from './pages/FastDelivery';
import SizeGuide from './pages/SizeGuide';
import ReturnsExchange from './pages/ReturnsExchange';
import SecurePayment from './pages/SecurePayment';
import ShippingPolicy from './pages/ShippingPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CustomerCare from './pages/CustomerCare';
import CustomerDashboard from './pages/CustomerDashboard';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { MetaPixel } from './components/MetaPixel';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminAddProduct from './pages/admin/AdminAddProduct';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminStockIn from './pages/admin/AdminStockIn';
import AdminStockOut from './pages/admin/AdminStockOut';
import AdminInventoryOverview from './pages/admin/AdminInventoryOverview';
import AdminMasterTable from './pages/admin/AdminMasterTable';
import AdminInventoryLog from './pages/admin/AdminInventoryLog';
import AdminExchanges from './pages/admin/AdminExchanges';
import AdminIssues from './pages/admin/AdminIssues';
import AdminMedia from './pages/admin/AdminMedia';
import FixSizes from './pages/admin/FixSizes';
import AdminFinance from './pages/admin/AdminFinance';
import AdminExpenses from './pages/admin/AdminExpenses';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = true }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { currentUser, customerUser, isAdmin, loading } = useAuth();

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white text-black font-bold uppercase tracking-widest text-xs">
       Loading Elegance...
    </div>
  );

  if (requireAdmin) {
    if (!currentUser) {
      return <Navigate to="/admin/login" replace />;
    }
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  } else {
    if (!currentUser && !customerUser) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <MainLayout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/category/:category" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/support" element={<Support />} />
        <Route path="/customer-care" element={<CustomerCare />} />
        <Route path="/fast-delivery" element={<FastDelivery />} />
        <Route path="/size-guide" element={<SizeGuide />} />
        <Route path="/returns-exchange" element={<ReturnsExchange />} />
        <Route path="/secure-payment" element={<SecurePayment />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        
        {/* Customer Routes */}
        <Route path="/dashboard" element={<ProtectedRoute requireAdmin={false}><CustomerDashboard /></ProtectedRoute>} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="add-product" element={<AdminAddProduct />} />
          <Route path="edit-product/:id" element={<AdminAddProduct />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="stock-in" element={<AdminStockIn />} />
          <Route path="stock-out" element={<AdminStockOut />} />
          <Route path="inventory" element={<AdminInventoryOverview />} />
          <Route path="master-table" element={<AdminMasterTable />} />
          <Route path="inventory-log" element={<AdminInventoryLog />} />
          <Route path="exchanges" element={<AdminExchanges />} />
          <Route path="issues" element={<AdminIssues />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="fix-sizes" element={<FixSizes />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="expenses" element={<AdminExpenses />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <ExpenseProvider>
          <BrandingProvider>
          <BannerProvider>
            <CategoryProvider>
              <ProductProvider>
                <InventoryProvider>
                  <OrderProvider>
                    <CurrencyProvider>
                      <CartProvider>
                        <Router>
                          <ScrollToTop />
                          <div className="min-h-screen bg-white selection:bg-black/10 selection:text-black">
                            <Toaster position="top-center" reverseOrder={false} />
                            <PixelTracker />
                            <MetaPixel />
                            <AppRoutes />
                          </div>
                        </Router>
                      </CartProvider>
                    </CurrencyProvider>
                  </OrderProvider>
                </InventoryProvider>
              </ProductProvider>
            </CategoryProvider>
          </BannerProvider>
        </BrandingProvider>
        </ExpenseProvider>
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;
