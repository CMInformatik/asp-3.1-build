# asp-3.1-build
Github Action for building ASP Core 3.1 Web Applications in Docker

# Verwendung
Diese Action nutzt ein Dockerfile im Hauptverzeichis des Zielrepositories, um ein lauffähiges Docker-Image zu erzeugen.  
Sie überträgt dieses Docker-Image in eine Registry ( default:`registry.cmicloud.ch` ).  
Ausserdem extrahiert sie die Binaries der App aus dem Docker-Image und legt sie in Github als Artefakte ab.  
Dazu erwartet sie, dass die Applikation sich im Verszeichnis `/app` des Docker-Images befindet.

Das Dockerfile ist jeweils im Zielrepository abzulegen. Beispiele finden sich direkt in diesem Repository.

Die Action nutzt einen einzigen Parameter: `app-name`.
Dieser bestimmt den Namen des resultierenden Docker-Images und den Titel der Artefakte, die in Github abgelegt werden sollen.
