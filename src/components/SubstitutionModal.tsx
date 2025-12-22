import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Insumo } from '../types';

interface SubstitutionModalProps {
    onClose: () => void;
    onConfirm: (substituteId: string) => void;
    recipeName: string;
    insumos: Insumo[]; // All available ingredients to choose from
    usageCount: number;
}

export function SubstitutionModal({ onClose, onConfirm, recipeName, insumos, usageCount }: SubstitutionModalProps) {
    const [selectedSubstitute, setSelectedSubstitute] = useState<string>('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-amber-100 p-2 rounded-full">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Substituição Necessária</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            A receita base <strong>"{recipeName}"</strong> gerou um insumo que está sendo usado em <strong>{usageCount}</strong> outras receitas.
                        </p>
                    </div>
                </div>

                <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                    Para excluir esta receita base, você deve selecionar um insumo substituto. O sistema atualizará todas as receitas afetadas automaticamente.
                </p>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selecione o Substituto (De/Para)
                    </label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedSubstitute}
                        onChange={(e) => setSelectedSubstitute(e.target.value)}
                        title="Selecione o insumo substituto"
                    >
                        <option value="">Selecione um insumo...</option>
                        {insumos
                            .filter(i => i.nome_padronizado !== recipeName) // Don't show self
                            .sort((a, b) => a.nome_padronizado.localeCompare(b.nome_padronizado))
                            .map(i => (
                                <option key={i.id} value={i.id}>
                                    {i.nome_padronizado}
                                </option>
                            ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => selectedSubstitute && onConfirm(selectedSubstitute)}
                        disabled={!selectedSubstitute}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        Confirmar e Excluir
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
