import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Ingredients } from './pages/Ingredients';
import { Recipes } from './pages/Recipes';
import { FinalProducts } from './pages/FinalProducts';
import { MarginsAnalytics } from './pages/MarginsAnalytics';
import { Simulator } from './pages/Simulator';
import { Dashboard } from './pages/Dashboard';
import { GeneralSettings } from './pages/GeneralSettings';
import { FoodControlProvider } from './contexts/FoodControlContext';

// Placeholder components for now

function App() {
  return (
    <FoodControlProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/products" element={<FinalProducts />} /> {/* New Route */}
            <Route path="/analytics" element={<MarginsAnalytics />} /> {/* New Route */}
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/settings" element={<GeneralSettings />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="*" element={<Dashboard />} /> {/* Catch-all redirects to Dashboard */}
          </Routes>
        </Layout>
      </Router>
    </FoodControlProvider>
  );
}

export default App;
