document.getElementById('addItem').addEventListener('click', function() {
    const itemsDiv = document.getElementById('items');
    const newItem = document.createElement('div');

    const stringToLookFor = document.createElement('input');
    stringToLookFor.type = 'text';
    stringToLookFor.name = 'stringToLookFor';
    stringToLookFor.placeholder = 'String to Look For';

    const howMany = document.createElement('input');
    howMany.type = 'number';
    howMany.name = 'howMany';
    howMany.placeholder = 'How Many';

    newItem.appendChild(stringToLookFor);
    newItem.appendChild(howMany);
    itemsDiv.appendChild(newItem);
});

const firstDropdown = document.getElementById("type");
const wasDestroyed = document.getElementById("wasDestroyedOption");
const wasKilled = document.getElementById("wasKilledOption");

firstDropdown.addEventListener("change", function () {
    const selectedValue = firstDropdown.value;
    wasDestroyed.style.display = "none";
    wasKilled.style.display = "none";
    if (selectedValue === "wasDestroyed") {
        wasDestroyed.style.display = "block";
    } else if (selectedValue === "wasKilled") {
        wasKilled.style.display = "block";
    }
});