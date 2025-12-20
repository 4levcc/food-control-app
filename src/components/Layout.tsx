import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, ChefHat, Package, TrendingUp, Settings } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/products', icon: ShoppingCart, label: 'Produtos Finais' },
        { path: '/ingredients', icon: Package, label: 'Insumos' },
        { path: '/recipes', icon: ChefHat, label: 'Fichas Técnicas' },
        { path: '/settings', icon: Settings, label: 'Cadastro Geral' },
        { path: '/analytics', icon: TrendingUp, label: 'Análise de Margens' },
        { path: '/simulator', icon: ShoppingCart, label: 'Simulador de Compras' },
    ];

    return (
        <div className="flex bg-gray-100 min-h-screen font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-xl flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-center">
                    <div className="bg-blue-600 p-2 rounded-lg shadow-lg rotate-3 transform hover:rotate-6 transition-transform">
                        <ChefHat className="text-white" size={32} />
                    </div>
                    <h1 className="ml-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Benta Brigaderia
                    </h1>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm font-semibold'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                                )}
                                <item.icon
                                    size={20}
                                    className={`mr-3 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                                        }`}
                                />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400 text-center leading-tight">
                    Desenvolvido por INOVARE Gestão Estratégica | Octopus Gestão Integrada | Tecnologia Google Antigravity
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};
