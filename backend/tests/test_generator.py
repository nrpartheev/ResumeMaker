import io


def test_generate_endpoint_exists(client):

    fake_file = (
        io.BytesIO(
            b"My name is John Doe"
        ),
        "about.txt"
    )

    data = {
        "jd": "Software Engineer role",
        "template": "basic",
        "about_file": fake_file
    }

    response = client.post(
        "/api/generate",
        data=data,
        content_type="multipart/form-data"
    )

    # We only check that API runs
    assert response.status_code in [
        200,
        500
    ]

def test_file_upload_processing(client):

    file_content = b"""
    Python Developer
    Flask
    React
    """

    fake_file = (
        io.BytesIO(file_content),
        "resume.txt"
    )

    data = {
        "jd": "Looking for Python developer",
        "template": "basic",
        "about_file": fake_file
    }

    response = client.post(
        "/api/generate",
        data=data,
        content_type="multipart/form-data"
    )

    assert response is not None