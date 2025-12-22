import { X, FileText, Settings } from 'lucide-react';

interface ExportRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (mode: 'managerial' | 'production') => void;
    recipeName: string;
}

export function ExportRecipeModal({ isOpen, onClose, onExport, recipeName }: ExportRecipeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Exportar Ficha Técnica
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                        title="Fechar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-6 text-sm">
                        Selecione o tipo de relatório que deseja gerar para <span className="font-semibold text-gray-800">"{recipeName}"</span>:
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => onExport('managerial')}
                            className="w-full group flex items-start gap-4 p-4 rounded-xl border-2 border-blue-100 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all text-left"
                        >
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Settings size={24} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Ficha Completa (Gerência)</h4>
                                <p className="text-xs text-gray-500">Inclui todos os custos, preços, margens e informações financeiras detalhadas.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => onExport('production')}
                            className="w-full group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all text-left"
                        >
                            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-gray-600 group-hover:text-white transition-colors">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Para Produção (Operacional)</h4>
                                <p className="text-xs text-gray-500">Apenas ingredientes, quantidades e modo de preparo. Sem valores financeiros.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
