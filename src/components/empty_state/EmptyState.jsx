export default function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24">
            <div className="mb-6 md:mb-8 w-48 md:w-64 lg:w-80">
                <img src="/not_found.png" alt="No tasks" className="w-full h-auto" />
            </div>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 text-center px-4">
                No Jobs Right Now
            </h3>
            <p className="text-gray-600 text-center text-xs md:text-sm lg:text-base max-w-md px-4">
                There are currently no depositions, hearings, or remote sessions assigned to you.
            </p>
        </div>
    );
}
