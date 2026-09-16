export function getPaginationItems(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({length: totalPages}, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, "end-ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [1, "start-ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }

    return [
        1,
        "start-ellipsis",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "end-ellipsis",
        totalPages,
    ];
}
