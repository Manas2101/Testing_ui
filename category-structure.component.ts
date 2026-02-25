import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-category-structure',
  templateUrl: './category-structure.component.html',
  styleUrls: ['./category-structure.component.scss']
})
export class CategoryStructureComponent implements OnInit {
  categoryStructureForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.categoryStructureForm = this.fb.group({
      categoryCode: ['', Validators.required],
      categoryBusinessName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
  }

  onContinue(): void {
    if (this.categoryStructureForm.valid) {
      console.log('Continue clicked', this.categoryStructureForm.value);
    }
  }

  onFind(): void {
    const formData = this.categoryStructureForm.value;
    console.log('Find clicked', formData);
  }

  onSubmit(): void {
    if (this.categoryStructureForm.valid) {
      console.log('Form submitted', this.categoryStructureForm.value);
    }
  }
}
