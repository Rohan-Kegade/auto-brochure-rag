from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("Venue Digital Brochure.pdf")

docs = loader.load()

print(docs)