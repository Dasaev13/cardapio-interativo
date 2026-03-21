export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="text-7xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-6">O cardápio que você está procurando não existe.</p>
        <p className="text-sm text-gray-400">
          Verifique o link enviado pelo estabelecimento.
        </p>
      </div>
    </div>
  );
}
