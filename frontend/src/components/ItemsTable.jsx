export default function ItemsTable({ items }) {
  if (!items?.length) return null;
  return (
    <section className="card p-7">
      <h3 className="mb-3 text-lg font-semibold tracking-tight">What's on the plate</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead className="text-sm text-mute">
            <tr><th className="pb-2 font-medium">Item</th><th className="pb-2 text-right font-medium">Weight</th><th className="pb-2 text-right font-medium">Calories</th></tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={`${i.name}-${idx}`} className="border-t border-line/70">
                <td className="py-3 pr-3">{i.name}</td>
                <td className="py-3 text-right text-mute">{i.grams} g</td>
                <td className="py-3 text-right font-medium">{i.calories} kcal</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
