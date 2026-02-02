import fitz
import sys 


# Extracting Text from a pdf File
def PdfTextExtraction(filepath):
    RawText=""
    sys.stdout.reconfigure(encoding="utf-8")
    with fitz.open(filepath) as pdf:
        for page in pdf:
            RawText+= page.get_text()+'\n\n'
    
    return RawText


#Extracting Text from  Multiple pdf File and merging them
def MultiPdfTextExtraction(Files):
    Rawtext=""
    for file in Files:
        Rawtext+=PdfTextExtraction(file)+" "

    return Rawtext



    
    

