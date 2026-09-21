import Spinner from './Spinner';

export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
