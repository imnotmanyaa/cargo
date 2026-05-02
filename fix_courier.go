package main

import (
	"io/ioutil"
	"strings"
)

func main() {
	b, _ := ioutil.ReadFile("src/components/CourierDashboard.tsx")
	s := string(b)
	
	s = strings.Replace(s,
		"const [selectedTask, setSelectedTask] = useState<Task | null>(null);",
		"const [selectedTask, setSelectedTask] = useState<Task | null>(null);\n  const [showPinModal, setShowPinModal] = useState<{type: 'pickup'|'delivery', task: Task} | null>(null);\n  const [pinCode, setPinCode] = useState('');", 1)

	s = strings.Replace(s,
		"          const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-confirm`), {",
		"          setShowPinModal({ type: 'pickup', task: selectedTask });\n          return;\n          const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-confirm`), {", 1)

	s = strings.Replace(s,
		"        const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/delivery-confirm`), {",
		"        setShowPinModal({ type: 'delivery', task: selectedTask });\n        return;\n        const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/delivery-confirm`), {", 1)

	// Add the actual submission logic below
	s = strings.Replace(s,
		"  const handleCompleteTask = async () => {",
		`  const submitPinCode = async () => {
    if (!showPinModal || !pinCode) return;
    try {
      const url = showPinModal.type === 'pickup' ? '/pickup-confirm' : '/delivery-confirm';
      const payload = showPinModal.type === 'pickup' ? { confirmed_at: new Date().toISOString(), code: pinCode } : { code: pinCode };
      const resp = await fetch(withApiBase(\`/api/shipments/\${showPinModal.task.id}\${url}\`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${localStorage.getItem('token') || ''}\` },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        await loadTasks();
        toast.success('Успешно');
        setShowPinModal(null);
        setPinCode('');
        setShowDetailsDialog(false);
      } else {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'Неверный PIN-код');
      }
    } catch(e) { toast.error('Сетевая ошибка'); }
  };

  const handleCompleteTask = async () => {`, 1)

	// Add the modal JSX
	s = strings.Replace(s,
		"      {/* Details Dialog */}",
		`      {showPinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Введите PIN-код</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Попросите клиента продиктовать 4-значный код из SMS.</p>
            <input
              type="text"
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0000"
              maxLength={4}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {setShowPinModal(null); setPinCode('');}}>Отмена</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={submitPinCode}>Подтвердить</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Details Dialog */}`, 1)

	ioutil.WriteFile("src/components/CourierDashboard.tsx", []byte(s), 0644)
}
