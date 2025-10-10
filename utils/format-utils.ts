

export function formatFileNameAsTitle(fileName: string): string { 
    //reomve file extension and replace special characters with spaces
    const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
    const withSpaces =withoutExtension
    .replace(/[_-]/g, " ")//replace dashes and underscores with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2"); 
    //add space before capital letter

    // Convert to title case{capitalize first letter of each word}
     return withSpaces
        .split(" ") 

        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
        .trim(); //remove leading and trailing spaces
}