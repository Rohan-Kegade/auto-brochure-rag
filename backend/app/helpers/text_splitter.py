from langchain_text_splitters import RecursiveCharacterTextSplitter

def split_documents(text):

    splitter = RecursiveCharacterTextSplitter(chunk_size = 500, chunk_overlap = 0)

    result = splitter.split_documents(text)
    print(len(result))

    return result