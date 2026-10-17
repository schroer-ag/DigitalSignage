export default function ScreenNotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-center text-gray-400">
      <div>
        <div className="text-lg font-medium text-gray-200">Screen not registered</div>
        <div className="mt-1 text-sm">
          Ask your super admin to register this screen in the admin console.
        </div>
      </div>
    </div>
  );
}
